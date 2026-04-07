import prisma from "@/lib/prisma";
import FormModal from "./FormModal";
import { getAuthData } from "@/lib/utils";


export type FormContainerProps = {
  table:
    | "teacher"
    | "student"
    | "parent"
    | "class"
    | "lesson"
    | "attendance"
    | "event"
    | "announcement"
    | "zone";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
};

const FormContainer = async ({ table, type, data, id }: FormContainerProps) => {
  let relatedData = {};
  const { userId, role } = getAuthData();


  if (type !== "delete") {
    switch (table) {
      case "class":
        const classGrades = await prisma.grade.findMany({
          where: { level: { in: [1, 2] } },
          select: { id: true, level: true },
          orderBy: { level: "asc" },
        });
        const classTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = { teachers: classTeachers, grades: classGrades };
        break;
      case "teacher":
        const teacherZones = await prisma.zone.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });
        relatedData = { zones: teacherZones };
        break;
      case "student":
        const studentGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
          orderBy: { level: "asc" },
        });
        const studentClasses = await prisma.class.findMany({
          include: { _count: { select: { students: true } } },
          orderBy: { name: "asc" },
        });
        const studentParents = await prisma.parent.findMany({
          select: { id: true, name: true, surname: true },
          orderBy: [{ surname: "asc" }, { name: "asc" }],
        });
        relatedData = {
          classes: studentClasses,
          grades: studentGrades,
          parents: studentParents,
        };
        break;
      default:
        break;
    }
  }

  return (
    <div className="">
      <FormModal
        table={table}
        type={type}
        data={data}
        id={id}
        relatedData={relatedData}
      />
    </div>
  );
};

export default FormContainer;