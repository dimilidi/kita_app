"use server";

import { revalidatePath } from "next/cache";
import {
  AnnouncementSchema,
  AttendanceSchema,
  ClassSchema,
  EventSchema,
  LessonSchema,
  ParentSchema,
  StudentSchema,
  TeacherSchema,
  ZoneSchema,
} from "./formValidationSchemas";
import { parseDateStrToUtcRange } from "./attendanceDate";
import { isWeekendDateStrUTC } from "./attendanceDate";
import { announcementAccessWhere } from "./announcementVisibility";
import { getUnreadAnnouncementCount } from "./announcementUnread";
import { getUnreadStaffChatCount } from "./staffChatUnread";
import { loadAttendancePageData } from "./attendancePageData";
import prisma from "./prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { getAuthData } from "./utils";
import { randomUUID } from "crypto";
import type { AttendanceRow } from "@/app/(dashboard)/list/attendance/types";

type CurrentState = {
  success: boolean;
  error: boolean;
  message?: string;
  inUse?: boolean;
};

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    await prisma.class.create({
      data,
    });

    // revalidatePath("/list/class");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    await prisma.class.update({
      where: {
        id: data.id,
      },
      data,
    });

    // revalidatePath("/list/class");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.class.delete({
      where: {
        id: parseInt(id),
      },
    });

    // revalidatePath("/list/class");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  try {
    const user = await clerkClient.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata:{role:"teacher"}
    });

    await prisma.teacher.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email,
        phone: data.phone,
        address: data.address,
        img: data.img,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        zones: {
          create: (data.zoneIds ?? []).map((zoneId) => ({
            id: randomUUID(),
            zoneId,
          })),
        },
      },
    });

    // revalidatePath("/list/teachers");
    return { success: true, error: false, message: "" };
  } catch (err: any) {
    console.error("TEACHER ACTION ERROR:", err);

    let message = "Something went wrong";

    // ✅ Handle Clerk validation errors
    if (err?.errors && Array.isArray(err.errors) && err.errors.length > 0) {
      message = err.errors[0].longMessage || err.errors[0].message || message;
    }
    // fallback
    else if (err?.message) {
      message = err.message;
    }

    return { success: false, error: true, message };
  }
};

// Direct-call variant for client-side manual submits (no useFormState).
export async function createTeacherDirect(
  data: TeacherSchema
): Promise<{ success: boolean; error: boolean; message?: string }> {
  return createTeacher({ success: false, error: false }, data);
}

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Missing teacher id" };
  }
  try {
    const user = await clerkClient.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    await prisma.teacher.update({
      where: {
        id: data.id,
      },
      data: {
        ...(data.password !== "" && { password: data.password }),
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        ...(data.img !== undefined && { img: data.img }),
        zones: {
          deleteMany: {},
          create: (data.zoneIds ?? []).map((zoneId) => ({
            id: randomUUID(),
            zoneId,
          })),
        },
      },
    });
    // revalidatePath("/list/teachers");
    return { success: true, error: false, message: "" };
  } catch (err: any) {
    console.error("TEACHER ACTION ERROR:", err);

    let message = "Something went wrong";

    // ✅ Handle Clerk validation errors
    if (err?.errors && Array.isArray(err.errors) && err.errors.length > 0) {
      message = err.errors[0].longMessage || err.errors[0].message || message;
    }
    // fallback
    else if (err?.message) {
      message = err.message;
    }

    return { success: false, error: true, message };
  }
};

// Direct-call variant for client-side manual submits (no useFormState).
export async function updateTeacherDirect(
  data: TeacherSchema
): Promise<{ success: boolean; error: boolean; message?: string }> {
  return updateTeacher({ success: false, error: false }, data);
}

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await clerkClient.users.deleteUser(id);

    await prisma.teacher.delete({
      where: {
        id: id,
      },
    });

    // revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  console.log(data);
  try {
    const parent = await prisma.parent.findUnique({
      where: { id: data.parentId },
      select: { email: true },
    });
    const emailNorm = parent?.email?.trim() ? parent.email.trim() : null;

    const classItem = await prisma.class.findUnique({
      where: { id: data.classId },
      include: { _count: { select: { students: true } } },
    });

    if (classItem && classItem.capacity === classItem._count.students) {
      return { success: false, error: true };
    }

    const user = await clerkClient.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata:{role:"student"}
    });

    await prisma.student.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: emailNorm,
        phone: null,
        address: data.address,
        img: data.img,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,
        bringTime: data.bringTime?.trim() || null,
        pickupTime: data.pickupTime?.trim() || null,
      },
    });

    // revalidatePath("/list/students");
    return { success: true, error: false, message: "" };
  } catch (err: any) {
    console.error("STUDENT ACTION ERROR:", err);

    let message = "Something went wrong";
    if (err?.errors && Array.isArray(err.errors) && err.errors.length > 0) {
      message = err.errors[0].longMessage || err.errors[0].message || message;
    } else if (err?.message) {
      message = err.message;
    }

    return { success: false, error: true, message };
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Missing student id" };
  }
  try {
    const parent = await prisma.parent.findUnique({
      where: { id: data.parentId },
      select: { email: true },
    });
    const emailNorm = parent?.email?.trim() ? parent.email.trim() : null;

    const user = await clerkClient.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    await prisma.student.update({
      where: {
        id: data.id,
      },
      data: {
         ...(data.password !== "" && { password: data.password }),
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: emailNorm,
        phone: null,
        address: data.address,
        ...(data.img !== undefined && { img: data.img }),
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,
        bringTime: data.bringTime?.trim() || null,
        pickupTime: data.pickupTime?.trim() || null,
      },
    });
    // revalidatePath("/list/students");
    return { success: true, error: false, message: "" };
  } catch (err: any) {
    console.error("STUDENT ACTION ERROR:", err);

    let message = "Something went wrong";
    if (err?.errors && Array.isArray(err.errors) && err.errors.length > 0) {
      message = err.errors[0].longMessage || err.errors[0].message || message;
    } else if (err?.message) {
      message = err.message;
    }

    return { success: false, error: true, message };
  }
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await clerkClient.users.deleteUser(id);

    await prisma.student.delete({
      where: {
        id: id,
      },
    });

    // revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};


export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  try {
    const user = await clerkClient.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: { role: "parent" },
    });

    await prisma.parent.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  if (!data.id) return { success: false, error: true };
  try {
    await clerkClient.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    await prisma.parent.update({
      where: { id: data.id },
      data: {
        ...(data.password !== "" && { password: data.password }),
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteParent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await clerkClient.users.deleteUser(id);
    await prisma.parent.delete({ where: { id } });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  try {
    const classId = finiteNumberFromForm(data.classId);
    const teacherId = data.teacherId?.trim() || null;
    const zoneId = data.zoneId?.trim() || null;
    if (classId == null || classId < 1 || !teacherId || !zoneId) {
      return { success: false, error: true };
    }
    await prisma.lesson.create({
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        zoneId,
        classId,
        teacherId,
      },
    });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

function finiteNumberFromForm(v: unknown): number | null {
  if (v === "" || v === undefined || v === null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export const updateLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  try {
    if (data.id == null) {
      return { success: false, error: true };
    }
    const classId = finiteNumberFromForm(data.classId);
    const teacherId = data.teacherId?.trim() || null;
    const zoneId = data.zoneId?.trim() || null;
    if (classId == null || classId < 1 || !teacherId || !zoneId) {
      return { success: false, error: true };
    }
    await prisma.lesson.update({
      where: { id: data.id },
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        zoneId,
        classId,
        teacherId,
      },
    });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

/** Alias: activities in UI are backed by Lesson + Zone play areas */
export const createActivity = createLesson;
export const updateActivity = updateLesson;

export const deleteLesson = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.lesson.delete({ where: { id: parseInt(id) } });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};


export const createAttendance = async (
  currentState: CurrentState,
  data: AttendanceSchema
) => {
  try {
    const dow = data.date.getUTCDay();
    if (dow === 0 || dow === 6) {
      return { success: false, error: true };
    }
    await prisma.attendance.create({
      data: {
        date: data.date,
        present: data.present ?? false,
        studentId: data.studentId,
        lessonId: data.lessonId,
      },
    });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateAttendance = async (
  currentState: CurrentState,
  data: AttendanceSchema
) => {
  try {
    const dow = data.date.getUTCDay();
    if (dow === 0 || dow === 6) {
      return { success: false, error: true };
    }
    await prisma.attendance.update({
      where: { id: data.id },
      data: {
        date: data.date,
        present: data.present ?? false,
        studentId: data.studentId,
        lessonId: data.lessonId,
      },
    });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteAttendance = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.attendance.delete({ where: { id: parseInt(id) } });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export async function saveDailyAttendance({
  studentId,
  dateStr,
  present,
}: {
  studentId: string;
  dateStr: string;
  present: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, role } = getAuthData();
    if (role !== "admin" && role !== "teacher") {
      return { success: false, error: "forbidden" };
    }

    const range = parseDateStrToUtcRange(dateStr);
    if (!range) {
      return { success: false, error: "invalidDate" };
    }
    if (isWeekendDateStrUTC(dateStr)) {
      return { success: false, error: "invalidDate" };
    }
    const { start, end } = range;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      return { success: false, error: "notFound" };
    }

    if (role === "teacher") {
      const teachesHere = await prisma.lesson.findFirst({
        where: {
          classId: student.classId,
          teacherId: userId!,
        },
      });
      if (!teachesHere) {
        return { success: false, error: "forbidden" };
      }
    }

    const lesson = await prisma.lesson.findFirst({
      where: { classId: student.classId },
      orderBy: { startTime: "asc" },
    });
    if (!lesson) {
      return { success: false, error: "noLesson" };
    }

    // Ensure complete daily snapshot for this class/day/lesson:
    // every student in the class gets exactly one row; missing rows default to present=false.
    const classStudentIds: string[] = (
      await prisma.student.findMany({
        where: { classId: student.classId },
        select: { id: true },
      })
    ).map((s: { id: string }) => s.id);
    const existingForDay = await prisma.attendance.findMany({
      where: {
        lessonId: lesson.id,
        date: { gte: start, lt: end },
        studentId: { in: classStudentIds },
      },
      select: { studentId: true },
    });
    const existingIds = new Set(existingForDay.map((r) => r.studentId));
    const missingIds = classStudentIds.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
      await prisma.attendance.createMany({
        data: missingIds.map((id) => ({
          studentId: id,
          lessonId: lesson.id,
          date: start,
          present: false,
        })),
      });
    }

    const existing = await prisma.attendance.findFirst({
      where: {
        studentId,
        lessonId: lesson.id,
        date: { gte: start, lt: end },
      },
      orderBy: { id: "desc" },
    });

    if (existing) {
      await prisma.attendance.update({
        where: { id: existing.id },
        data: { present },
      });
    } else {
      await prisma.attendance.create({
        data: {
          studentId,
          lessonId: lesson.id,
          date: start,
          present,
        },
      });
    }

    return { success: true };
  } catch (err) {
    console.log(err);
    return { success: false, error: "server" };
  }
}

/**
 * Bulk set attendance for many students for a specific lesson on a given day.
 * Uses `updateMany` for existing rows and `createMany` for missing rows.
 */
export async function saveDailyAttendanceForLessonMany({
  lessonId,
  studentIds,
  dateStr,
  present,
}: {
  lessonId: number;
  studentIds: string[];
  dateStr: string;
  present: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, role } = getAuthData();
    if (role !== "admin" && role !== "teacher") {
      return { success: false, error: "forbidden" };
    }

    const range = parseDateStrToUtcRange(dateStr);
    if (!range) {
      return { success: false, error: "invalidDate" };
    }
    if (isWeekendDateStrUTC(dateStr)) {
      return { success: false, error: "invalidDate" };
    }
    const { start, end } = range;

    const ids = Array.from(new Set(studentIds.map((s) => String(s).trim()).filter(Boolean)));
    if (ids.length === 0) {
      return { success: true };
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, teacherId: true },
    });
    if (!lesson) {
      return { success: false, error: "noLesson" };
    }
    if (role === "teacher" && lesson.teacherId !== userId) {
      return { success: false, error: "forbidden" };
    }

    // Ensure complete daily snapshot for these students: missing rows default to present=false.
    const existingForDay = await prisma.attendance.findMany({
      where: {
        lessonId,
        studentId: { in: ids },
        date: { gte: start, lt: end },
      },
      select: { studentId: true },
    });
    const existingIdsForDay = new Set(existingForDay.map((e) => e.studentId));
    const missingIdsForDay = ids.filter((id) => !existingIdsForDay.has(id));
    if (missingIdsForDay.length > 0) {
      await prisma.attendance.createMany({
        data: missingIdsForDay.map((studentId) => ({
          studentId,
          lessonId,
          date: start,
          present: false,
        })),
      });
    }

    const existing = await prisma.attendance.findMany({
      where: {
        lessonId,
        studentId: { in: ids },
        date: { gte: start, lt: end },
      },
      select: { studentId: true },
    });
    const existingIds = new Set(existing.map((e) => e.studentId));
    const missingIds = ids.filter((id) => !existingIds.has(id));

    await prisma.$transaction([
      prisma.attendance.updateMany({
        where: {
          lessonId,
          studentId: { in: ids },
          date: { gte: start, lt: end },
        },
        data: { present },
      }),
    ]);

    return { success: true };
  } catch (err) {
    console.log(err);
    return { success: false, error: "server" };
  }
}

/**
 * Bulk set attendance for *all* students matching the current attendance page filters.
 * This is used by the "select all" checkbox on page 1.
 */
export async function saveDailyAttendanceForAttendancePageFilterAll({
  dateStr,
  classIdParam,
  present,
}: {
  dateStr: string;
  classIdParam: string;
  present: boolean;
}): Promise<{ success: boolean; error?: string; updated?: number }> {
  try {
    const { role } = getAuthData();
    if (role !== "admin" && role !== "teacher") {
      return { success: false, error: "forbidden" };
    }

    const range = parseDateStrToUtcRange(dateStr);
    if (!range) {
      return { success: false, error: "invalidDate" };
    }
    if (isWeekendDateStrUTC(dateStr)) {
      return { success: false, error: "invalidDate" };
    }
    const { start, end } = range;

    const { rows } = (await loadAttendancePageData({
      dateStr,
      classIdParam,
      page: 1,
      fetchAllRows: true,
    })) as { rows: AttendanceRow[] };

    const rowsWithLesson = rows.filter((r) => !!r.lessonId);
    if (rowsWithLesson.length === 0) {
      return { success: true, updated: 0 };
    }

    const byLesson = new Map<number, string[]>();
    for (const r of rowsWithLesson) {
      const lid = r.lessonId!;
      const studentId = String(r.id);
      const arr = byLesson.get(lid);
      if (arr) arr.push(studentId);
      else byLesson.set(lid, [studentId]);
    }

    // For each lesson group, update existing rows and create missing ones.
    // We chunk student ids a bit to avoid overly large queries.
    const CHUNK = 500;
    for (const [lessonId, allStudentIds] of Array.from(byLesson.entries())) {
      const ids = Array.from(new Set<string>(allStudentIds.map((s) => String(s))));
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunkIds: string[] = ids.slice(i, i + CHUNK);

        // Ensure complete daily snapshot for this chunk: missing rows default to present=false.
        const existingForDay = await prisma.attendance.findMany({
          where: {
            lessonId,
            studentId: { in: chunkIds },
            date: { gte: start, lt: end },
          },
          select: { studentId: true },
        });
        const existingIdsForDay = new Set(existingForDay.map((e) => e.studentId));
        const missingIdsForDay: string[] = chunkIds.filter(
          (id) => !existingIdsForDay.has(id)
        );
        if (missingIdsForDay.length > 0) {
          await prisma.attendance.createMany({
            data: missingIdsForDay.map((studentId) => ({
              studentId,
              lessonId,
              date: start,
              present: false,
            })),
          });
        }

        const existing = await prisma.attendance.findMany({
          where: {
            lessonId,
            studentId: { in: chunkIds },
            date: { gte: start, lt: end },
          },
          select: { studentId: true },
        });
        const existingIds = new Set(existing.map((e) => e.studentId));
        const missingIds: string[] = chunkIds.filter((id) => !existingIds.has(id));

        await prisma.$transaction([
          prisma.attendance.updateMany({
            where: {
              lessonId,
              studentId: { in: chunkIds },
              date: { gte: start, lt: end },
            },
            data: { present },
          }),
        ]);
      }
    }

    return { success: true, updated: rowsWithLesson.length };
  } catch (err) {
    console.log(err);
    return { success: false, error: "server" };
  }
}

/** Daily attendance note and/or pickup override. Creates row if missing. Omit a field to leave it unchanged. */
export async function saveAttendanceDayDetail({
  studentId,
  dateStr,
  note,
  actualPickupTime,
}: {
  studentId: string;
  dateStr: string;
  note?: string | null;
  actualPickupTime?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, role } = getAuthData();
    if (role !== "admin" && role !== "teacher") {
      return { success: false, error: "forbidden" };
    }

    const range = parseDateStrToUtcRange(dateStr);
    if (!range) {
      return { success: false, error: "invalidDate" };
    }
    if (isWeekendDateStrUTC(dateStr)) {
      return { success: false, error: "invalidDate" };
    }
    const { start, end } = range;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      return { success: false, error: "notFound" };
    }

    if (role === "teacher") {
      const teachesHere = await prisma.lesson.findFirst({
        where: {
          classId: student.classId,
          teacherId: userId!,
        },
      });
      if (!teachesHere) {
        return { success: false, error: "forbidden" };
      }
    }

    const lesson = await prisma.lesson.findFirst({
      where: { classId: student.classId },
      orderBy: { startTime: "asc" },
    });
    if (!lesson) {
      return { success: false, error: "noLesson" };
    }

    const noteNorm =
      note === undefined ? undefined : note?.trim() ? note.trim() : null;
    const pickupNorm =
      actualPickupTime === undefined
        ? undefined
        : actualPickupTime?.trim()
          ? actualPickupTime.trim()
          : null;

    const existing = await prisma.attendance.findFirst({
      where: {
        studentId,
        lessonId: lesson.id,
        date: { gte: start, lt: end },
      },
    });

    if (existing) {
      await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          ...(noteNorm !== undefined ? { note: noteNorm } : {}),
          ...(pickupNorm !== undefined ? { actualPickupTime: pickupNorm } : {}),
        },
      });
    } else {
      await prisma.attendance.create({
        data: {
          studentId,
          lessonId: lesson.id,
          date: start,
          present: false,
          note: note !== undefined ? (noteNorm ?? null) : null,
          actualPickupTime:
            actualPickupTime !== undefined ? (pickupNorm ?? null) : null,
        },
      });
    }

    return { success: true };
  } catch (err) {
    console.log(err);
    return { success: false, error: "server" };
  }
}

/** Full attendance rows for PDF export (all matching students, not paginated). */
export async function getAttendanceRowsForPdfExport(
  dateStr: string,
  classIdParam: string
): Promise<AttendanceRow[]> {
  const { rows } = await loadAttendancePageData({
    dateStr,
    classIdParam,
    page: 1,
    fetchAllRows: true,
  });
  return rows;
}

/** Marks every announcement visible to the current user as read (e.g. after opening the list). */
export async function markVisibleAnnouncementsAsRead(): Promise<void> {
  const { userId, role } = getAuthData();
  if (!userId) {
    return;
  }
  const access = announcementAccessWhere(role, userId);
  const unread = await prisma.announcement.findMany({
    where: {
      AND: [
        access,
        {
          reads: {
            none: {
              userId,
            },
          },
        },
      ],
    },
    select: { id: true },
  });
  if (unread.length === 0) {
    return;
  }
  await prisma.announcementRead.createMany({
    data: unread.map((a) => ({ userId, announcementId: a.id })),
    skipDuplicates: true,
  });
}

/** For client components (navbar badge refresh on navigation). */
export async function getUnreadAnnouncementCountAction(): Promise<number> {
  return getUnreadAnnouncementCount();
}

/** For client components (navbar badge refresh on navigation). */
export async function getUnreadStaffChatCountAction(): Promise<number> {
  return getUnreadStaffChatCount();
}

export const createEvent = async (
  currentState: CurrentState,
  data: EventSchema
) => {
  try {
    await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        classId: data.classId ?? null,
      },
    });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateEvent = async (
  currentState: CurrentState,
  data: EventSchema
) => {
  try {
    await prisma.event.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        classId: data.classId ?? null,
      },
    });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteEvent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.event.delete({ where: { id: parseInt(id) } });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema
) => {
  try {
    await prisma.announcement.create({
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classId: data.classId ?? null,
      },
    });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema
) => {
  try {
    await prisma.announcement.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classId: data.classId ?? null,
      },
    });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteAnnouncement = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.announcement.delete({ where: { id: parseInt(id) } });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createZone = async (
  currentState: CurrentState,
  data: ZoneSchema
) => {
  try {
    const { role } = getAuthData();
    if (role !== "admin") {
      return { success: false, error: true };
    }
    await prisma.zone.create({
      data: {
        name: data.name.trim(),
        capacity: data.capacity ?? null,
        description: data.description?.trim() || null,
        color: data.color?.trim() || null,
      },
    });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateZone = async (
  currentState: CurrentState,
  data: ZoneSchema
) => {
  try {
    const { role } = getAuthData();
    if (role !== "admin" || !data.id) {
      return { success: false, error: true };
    }
    await prisma.zone.update({
      where: { id: data.id },
      data: {
        name: data.name.trim(),
        capacity: data.capacity ?? null,
        description: data.description?.trim() || null,
        color: data.color?.trim() || null,
      },
    });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteZone = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const { role } = getAuthData();
    if (role !== "admin") {
      return { success: false, error: true };
    }
    const [lessons, activities, studentZones, teacherZones, history] =
      await Promise.all([
        prisma.lesson.count({ where: { zoneId: id } }),
        prisma.activity.count({ where: { zoneId: id } }),
        prisma.studentZone.count({ where: { zoneId: id } }),
        prisma.teacherZone.count({ where: { zoneId: id } }),
        prisma.zoneHistory.count({ where: { zoneId: id } }),
      ]);
    if (
      lessons + activities + studentZones + teacherZones + history >
      0
    ) {
      return { success: false, error: true, inUse: true };
    }
    await prisma.zone.delete({ where: { id } });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export async function saveZones(zones: Record<string, string[]>) {
  try {
    if (!zones || typeof zones !== "object") {
      throw new Error("zones undefined or invalid");
    }

    const records = Object.entries(zones)
      .flatMap(([zoneId, students]) =>
        students.map((studentId) => ({
          studentId,
          zoneId,
        }))
      )
      .filter((z) => z.zoneId !== "pool");

    if (records.length === 0) {
      await prisma.studentZone.deleteMany();
      return;
    }

    // Log movement history: whenever a student's "current zone" changes,
    // create a ZoneHistory record. (Needed for the "Time by Play Area" chart.)
    const existingStudentZones = await prisma.studentZone.findMany({
      select: { studentId: true, zoneId: true },
    });

    const prevByStudentId = new Map(
      existingStudentZones.map((z) => [z.studentId, z.zoneId])
    );

    const nextByStudentId = new Map(
      records.map((r) => [r.studentId, r.zoneId])
    );

    const historyToCreate = Array.from(nextByStudentId.entries())
      .filter(([studentId, nextZoneId]) => prevByStudentId.get(studentId) !== nextZoneId)
      .map(([studentId, nextZoneId]) => ({
        id: randomUUID(),
        studentId,
        zoneId: nextZoneId,
      }));

    await prisma.$transaction([
      prisma.studentZone.deleteMany(),
      prisma.studentZone.createMany({
        data: records,
      }),
      ...(historyToCreate.length > 0
        ? [
            prisma.zoneHistory.createMany({
              data: historyToCreate,
            }),
          ]
        : []),
    ]);
  } catch (error) {
    console.error("Failed to save zones:", error);
    throw error;
  }
}

/** Persists educator placement: one zone per teacher (pool = no TeacherZone rows). Uses existing TeacherZone table. */
export async function saveTeacherZones(zones: Record<string, string[]>) {
  try {
    if (!zones || typeof zones !== "object") {
      throw new Error("teacher zones undefined or invalid");
    }

    const records = Object.entries(zones)
      .flatMap(([zoneId, teacherIds]) =>
        teacherIds.map((teacherId) => ({
          id: randomUUID(),
          teacherId,
          zoneId,
        }))
      )
      .filter((z) => z.zoneId !== "teacherPool");

    await prisma.$transaction([
      prisma.teacherZone.deleteMany(),
      ...(records.length > 0
        ? [
            prisma.teacherZone.createMany({
              data: records,
            }),
          ]
        : []),
    ]);
  } catch (error) {
    console.error("Failed to save teacher zones:", error);
    throw error;
  }
}

/** Persists educator placement on lunch board (pool = no TeacherLunchGroup rows). */
export async function saveTeacherLunchGroups(groups: Record<string, string[]>) {
  try {
    if (!groups || typeof groups !== "object") {
      throw new Error("teacher lunch groups undefined or invalid");
    }

    const validGroupIds = new Set(
      (
        await (prisma as any).lunchGroupEntity.findMany({
          select: { id: true },
        })
      ).map((g: { id: string }) => g.id)
    );

    const records = Object.entries(groups)
      .flatMap(([groupId, teacherIds]) =>
        teacherIds.map((teacherId) => ({
          id: randomUUID(),
          teacherId,
          groupId,
        }))
      )
      .filter(
        (z) => z.groupId !== "teacherPool" && validGroupIds.has(z.groupId)
      );

    await prisma.$transaction([
      prisma.teacherLunchGroup.deleteMany(),
      ...(records.length > 0
        ? [
            prisma.teacherLunchGroup.createMany({
              data: records,
            }),
          ]
        : []),
    ]);
    revalidatePath("/list/lunch");
  } catch (error) {
    console.error("Failed to save teacher lunch groups:", error);
    throw error;
  }
}

export async function saveLunchGroups(groups: Record<string, string[]>) {
  try {
    if (!groups || typeof groups !== "object") {
      throw new Error("groups undefined or invalid");
    }

    const validGroupIds = new Set(
      (
        await (prisma as any).lunchGroupEntity.findMany({
          select: { id: true },
        })
      ).map((g: { id: string }) => g.id)
    );
    const records = Object.entries(groups)
      .flatMap(([group, students]) =>
        students.map((studentId) => ({
          studentId,
          groupId: group,
        }))
      )
      .filter((item) => validGroupIds.has(item.groupId));

    if (records.length === 0) {
      await prisma.studentLunchGroup.deleteMany();
      return;
    }

    await prisma.$transaction([
      prisma.studentLunchGroup.deleteMany(),
      prisma.studentLunchGroup.createMany({
        data: records as any,
      }),
    ]);
  } catch (error) {
    console.error("Failed to save lunch groups:", error);
    throw error;
  }
}

/** Removes all lunch assignments and Tischspruch votes (fresh start). */
export async function clearLunchBoard() {
  try {
    await prisma.$transaction([
      prisma.studentLunchGroup.deleteMany(),
      prisma.teacherLunchGroup.deleteMany(),
      prisma.studentLunchVote.deleteMany(),
    ]);
    revalidatePath("/list/lunch");
  } catch (error) {
    console.error("Failed to clear lunch board:", error);
    throw error;
  }
}

/** Removes all play-area placements (children + educators back to pools). */
export async function clearPlayBoard() {
  try {
    await prisma.$transaction([
      prisma.studentZone.deleteMany(),
      prisma.teacherZone.deleteMany(),
    ]);
    revalidatePath("/list/areas/board");
  } catch (error) {
    console.error("Failed to clear play board:", error);
    throw error;
  }
}

export async function saveLunchVote(params: {
  studentId: string;
  groupId: string;
  tischspruchId: number;
}) {
  const { studentId, groupId, tischspruchId } = params;

  try {
    await prisma.studentLunchVote.upsert({
      where: { studentId },
      update: { groupId, tischspruchId } as any,
      create: { studentId, groupId, tischspruchId } as any,
    });
  } catch (error) {
    console.error("Failed to save lunch vote:", error);
    throw error;
  }
}

export async function createLunchGroup(data: {
  name: string;
  color?: string;
  capacity?: number;
}) {
  try {
    const name = data.name.trim();
    if (!name) throw new Error("Lunch group name is required");

    await (prisma as any).lunchGroupEntity.create({
      data: {
        name,
        color: data.color?.trim() || null,
        capacity: data.capacity ?? 15,
      },
    });
    revalidatePath("/list/lunch");
    revalidatePath("/list/lunch-groups");
    return { success: true, error: false };
  } catch (error) {
    console.error("Failed to create lunch group:", error);
    return { success: false, error: true };
  }
}

export async function updateLunchGroup(
  id: string,
  data: { name: string; color?: string; capacity?: number }
) {
  try {
    const name = data.name.trim();
    if (!name) throw new Error("Lunch group name is required");

    await (prisma as any).lunchGroupEntity.update({
      where: { id },
      data: {
        name,
        color: data.color?.trim() || null,
        capacity: data.capacity ?? 15,
      },
    });
    revalidatePath("/list/lunch");
    revalidatePath("/list/lunch-groups");
    return { success: true, error: false };
  } catch (error) {
    console.error("Failed to update lunch group:", error);
    return { success: false, error: true };
  }
}

export async function deleteLunchGroup(id: string) {
  try {
    await prisma.$transaction([
      prisma.studentLunchVote.deleteMany({ where: { groupId: id } as any }),
      prisma.studentLunchGroup.deleteMany({ where: { groupId: id } as any }),
      (prisma as any).lunchGroupEntity.delete({ where: { id } }),
    ]);
    revalidatePath("/list/lunch");
    revalidatePath("/list/lunch-groups");
    return { success: true, error: false };
  } catch (error) {
    console.error("Failed to delete lunch group:", error);
    return { success: false, error: true };
  }
}

export async function createTischspruch(data: { title: string; text: string }) {
  try {
    const normalizedTitle = data.title.trim();
    const normalizedText = data.text.trim();
    if (!normalizedTitle) throw new Error("Tischspruch title is required");
    if (!normalizedText) throw new Error("Tischspruch text is required");

    await prisma.tischspruch.create({
      data: { title: normalizedTitle, text: normalizedText },
    });

    revalidatePath("/list/lunch");
    return { success: true, error: false };
  } catch (error) {
    console.error("Failed to create Tischspruch:", error);
    return { success: false, error: true };
  }
}

export async function updateTischspruch(
  id: number,
  data: { title: string; text: string }
) {
  try {
    const normalizedTitle = data.title.trim();
    const normalizedText = data.text.trim();
    if (!normalizedTitle) throw new Error("Tischspruch title is required");
    if (!normalizedText) throw new Error("Tischspruch text is required");

    await prisma.tischspruch.update({
      where: { id },
      data: { title: normalizedTitle, text: normalizedText },
    });

    revalidatePath("/list/lunch");
    return { success: true, error: false };
  } catch (error) {
    console.error("Failed to update Tischspruch:", error);
    return { success: false, error: true };
  }
}

export async function deleteTischspruch(id: number) {
  try {
    await prisma.tischspruch.delete({
      where: { id },
    });

    revalidatePath("/list/lunch");
    return { success: true, error: false };
  } catch (error) {
    console.error("Failed to delete Tischspruch:", error);
    return { success: false, error: true };
  }
}

export async function upsertTeacherAttendance({
  teacherId,
  dateStr,
  present,
}: {
  teacherId: string;
  dateStr: string;
  present: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, role } = getAuthData();
    if (role !== "admin" && role !== "teacher") {
      return { success: false, error: "forbidden" };
    }
    if (role === "teacher") {
      if (!userId || teacherId !== userId) {
        return { success: false, error: "forbidden" };
      }
    }
    const range = parseDateStrToUtcRange(dateStr);
    if (!range) {
      return { success: false, error: "invalidDate" };
    }
    if (isWeekendDateStrUTC(dateStr)) {
      return { success: false, error: "invalidDate" };
    }
    const exists = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!exists) {
      return { success: false, error: "notFound" };
    }

    // Ensure a complete daily record exists when admins take attendance:
    // every teacher gets exactly one row for the day (missing rows default to present=false).
    // We only do this backfill for admins to avoid teachers affecting other staff visibility.
    if (role === "admin") {
      const allTeacherIds = (
        await prisma.teacher.findMany({ select: { id: true } })
      ).map((t) => t.id);
      await prisma.teacherAttendance.createMany({
        data: allTeacherIds.map((id) => ({
          teacherId: id,
          date: range.start,
          present: false,
        })),
        skipDuplicates: true,
      });
    }

    await prisma.teacherAttendance.upsert({
      where: {
        teacherId_date: {
          teacherId,
          date: range.start,
        },
      },
      create: {
        teacherId,
        date: range.start,
        present,
      },
      update: { present },
    });

    revalidatePath("/list/teachers-attendance");
    revalidatePath("/list/lunch");
    revalidatePath("/list/areas/board");
    return { success: true };
  } catch (e) {
    console.error("upsertTeacherAttendance", e);
    return { success: false, error: "server" };
  }
}