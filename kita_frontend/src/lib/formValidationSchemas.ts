import { z } from "zod";

export const subjectSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "forms.required" }),
  teachers: z.array(z.string()), //teacher ids
});

//export type SubjectSchema = z.infer<typeof subjectSchema>;
export type SubjectInput = z.input<typeof subjectSchema>;
export type SubjectSchema = z.output<typeof subjectSchema>;


export const classSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "forms.required" }),
  capacity: z.coerce.number().min(1, { message: "forms.required" }),
  gradeId: z.coerce.number().min(1, { message: "forms.required" }),
  supervisorId: z.coerce.string().optional(),
});

// export type ClassSchema = z.infer<typeof classSchema>;
export type ClassInput = z.input<typeof classSchema>;
export type ClassSchema = z.output<typeof classSchema>;

export const teacherSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "forms.usernameMin" })
    .max(20, { message: "forms.usernameMax" }),
  password: z
    .string()
    .min(8, { message: "forms.passwordMin" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "forms.required" }),
  surname: z.string().min(1, { message: "forms.required" }),
  email: z
    .string()
    .email({ message: "forms.invalidEmail" })
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  address: z.string(),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "forms.required" }),
  birthday: z.coerce.date({ message: "forms.required" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "forms.required" }),
  // Legacy (not used in UI anymore): subject ids
  subjects: z.array(z.string()).optional(),
  // Kindergarten domain: play areas (zones)
  zoneIds: z.array(z.string()).optional(),
});

// export type TeacherSchema = z.infer<typeof teacherSchema>;
export type TeacherInput = z.input<typeof teacherSchema>;
export type TeacherSchema = z.output<typeof teacherSchema>;

/** Empty select / invalid numeric → undefined so z.number() does not become NaN */
const requiredPositiveInt = (v: unknown) => {
  if (v === "" || v === undefined || v === null) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export const studentSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "forms.usernameMin" })
    .max(20, { message: "forms.usernameMax" }),
  password: z
    .string()
    .min(8, { message: "forms.passwordMin" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "forms.required" }),
  surname: z.string().min(1, { message: "forms.required" }),
  email: z
    .string()
    .email({ message: "forms.invalidEmail" })
    .optional()
    .or(z.literal("")),
  address: z.string(),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "forms.required" }),
  birthday: z.coerce.date({ message: "forms.required" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "forms.required" }),
  gradeId: z.preprocess(
    requiredPositiveInt,
    z
      .number({
        required_error: "forms.required",
        invalid_type_error: "forms.required",
      })
      .min(1, { message: "forms.required" })
  ),
  classId: z.preprocess(
    requiredPositiveInt,
    z
      .number({
        required_error: "forms.required",
        invalid_type_error: "forms.required",
      })
      .min(1, { message: "forms.required" })
  ),
  parentId: z.string().trim().min(1, { message: "forms.required" }),
  bringTime: z.string().optional().or(z.literal("")),
  pickupTime: z.string().optional().or(z.literal("")),
});

// export type StudentSchema = z.infer<typeof studentSchema>;
export type StudentInput = z.input<typeof studentSchema>;
export type StudentSchema = z.output<typeof studentSchema>;

export const examSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "forms.required" }),
  startTime: z.coerce.date({ message: "forms.required" }),
  endTime: z.coerce.date({ message: "forms.required" }),
  lessonId: z.coerce.number({ message: "forms.required" }),
});

// export type ExamSchema = z.infer<typeof examSchema>;
export type ExamInput = z.input<typeof examSchema>;
export type ExamSchema = z.output<typeof examSchema>;

export const parentSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "forms.usernameMin" })
    .max(20, { message: "forms.usernameMax" }),
  password: z
    .string()
    .min(8, { message: "forms.passwordMin" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "forms.required" }),
  surname: z.string().min(1, { message: "forms.required" }),
  email: z
    .string()
    .email({ message: "forms.invalidEmail" })
    .optional()
    .or(z.literal("")),
  phone: z.string().min(1, { message: "forms.required" }),
  address: z.string().min(1, { message: "forms.required" }),
});

export type ParentInput = z.input<typeof parentSchema>;
export type ParentSchema = z.output<typeof parentSchema>;

const finiteNumber = (v: unknown): number | undefined => {
  if (v === "" || v === undefined || v === null) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export const lessonSchema = z.object({
  id: z.preprocess(finiteNumber, z.number().optional()),
  name: z.string().min(1, { message: "forms.required" }),
  day: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"], {
    message: "forms.required",
  }),
  startTime: z.coerce.date({ message: "forms.required" }),
  endTime: z.coerce.date({ message: "forms.required" }),
  /** Play area: Zone.id (cuid string), not a number */
  zoneId: z.string().min(1, { message: "forms.required" }),
  classId: z.preprocess(finiteNumber, z.number().min(1, { message: "forms.required" })),
  teacherId: z.string().min(1, { message: "forms.required" }),
});

export type LessonInput = z.input<typeof lessonSchema>;
export type LessonSchema = z.output<typeof lessonSchema>;

export const assignmentSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "forms.required" }),
  startDate: z.coerce.date({ message: "forms.required" }),
  dueDate: z.coerce.date({ message: "forms.required" }),
  lessonId: z.coerce.number().min(1, { message: "forms.required" }),
});

export type AssignmentInput = z.input<typeof assignmentSchema>;
export type AssignmentSchema = z.output<typeof assignmentSchema>;

export const resultSchema = z.object({
  id: z.coerce.number().optional(),
  score: z.coerce.number().min(0, { message: "forms.required" }),
  studentId: z.coerce.string().min(1, { message: "forms.required" }),
  examId: z.coerce.number().optional(),
  assignmentId: z.coerce.number().optional(),
});

export type ResultInput = z.input<typeof resultSchema>;
export type ResultSchema = z.output<typeof resultSchema>;

export const attendanceSchema = z.object({
  id: z.coerce.number().optional(),
  date: z.coerce.date({ message: "forms.required" }),
  present: z.coerce.boolean().optional(),
  studentId: z.coerce.string().min(1, { message: "forms.required" }),
  lessonId: z.coerce.number().min(1, { message: "forms.required" }),
});

export type AttendanceInput = z.input<typeof attendanceSchema>;
export type AttendanceSchema = z.output<typeof attendanceSchema>;

export const eventSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "forms.required" }),
  description: z.string().min(1, { message: "forms.required" }),
  startTime: z.coerce.date({ message: "forms.required" }),
  endTime: z.coerce.date({ message: "forms.required" }),
  classId: z.coerce.number().optional(),
});

export type EventInput = z.input<typeof eventSchema>;
export type EventSchema = z.output<typeof eventSchema>;

export const announcementSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "forms.required" }),
  description: z.string().min(1, { message: "forms.required" }),
  date: z.coerce.date({ message: "forms.required" }),
  classId: z.coerce.number().optional(),
});

export type AnnouncementInput = z.input<typeof announcementSchema>;
export type AnnouncementSchema = z.output<typeof announcementSchema>;

const emptyToUndefined = (v: unknown) =>
  v === "" || v === undefined || v === null ? undefined : v;

export const zoneSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "forms.required" }),
  capacity: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  description: z.preprocess(emptyToUndefined, z.string().optional()),
  color: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type ZoneInput = z.input<typeof zoneSchema>;
export type ZoneSchema = z.output<typeof zoneSchema>;