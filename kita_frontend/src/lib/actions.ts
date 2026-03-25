"use server";

import { revalidatePath } from "next/cache";
import {
  ClassSchema,
  ExamSchema,
  StudentSchema,
  SubjectSchema,
  TeacherSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { clerkClient } from "@clerk/nextjs/server";

type CurrentState = { success: boolean; error: boolean };

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    await prisma.subject.create({
      data: {
        name: data.name,
        teachers: {
          connect: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    await prisma.subject.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        teachers: {
          set: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.subject.delete({
      where: {
        id: parseInt(id),
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
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
        subjects: {
          connect: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });

    // revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
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
        subjects: {
          set: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });
    // revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

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
        email: data.email,
        phone: data.phone,
        address: data.address,
        img: data.img,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,
      },
    });

    // revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
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
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        ...(data.img !== undefined && { img: data.img }),
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,
      },
    });
    // revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
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

export const createExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // if (role === "teacher") {
    //   const teacherLesson = await prisma.lesson.findFirst({
    //     where: {
    //       teacherId: userId!,
    //       id: data.lessonId,
    //     },
    //   });

    //   if (!teacherLesson) {
    //     return { success: false, error: true };
    //   }
    // }

    await prisma.exam.create({
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // if (role === "teacher") {
    //   const teacherLesson = await prisma.lesson.findFirst({
    //     where: {
    //       teacherId: userId!,
    //       id: data.lessonId,
    //     },
    //   });

    //   if (!teacherLesson) {
    //     return { success: false, error: true };
    //   }
    // }

    await prisma.exam.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteExam = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    await prisma.exam.delete({
      where: {
        id: parseInt(id),
        // ...(role === "teacher" ? { lesson: { teacherId: userId! } } : {}),
      },
    });

    // revalidatePath("/list/subjects");
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

    await prisma.$transaction([
      prisma.studentZone.deleteMany(),
      prisma.studentZone.createMany({
        data: records,
      }),
    ]);
  } catch (error) {
    console.error("Failed to save zones:", error);
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