import prisma from "@/lib/prisma";
import UserCardsRowClient from "./UserCardsRowClient";
import {
  academicYearUtcRange,
  parseAcademicYearQuery,
} from "@/lib/academicYear";

export default async function UserCardsSection({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const yearStart = parseAcademicYearQuery(searchParams.year);
  const { start, end } = academicYearUtcRange(yearStart);

  const [adminCount, teacherCount, studentCount, parentCount] =
    await Promise.all([
      prisma.admin.count(),
      prisma.teacher.count({
        where: { createdAt: { gte: start, lt: end } },
      }),
      prisma.student.count({
        where: { createdAt: { gte: start, lt: end } },
      }),
      prisma.parent.count({
        where: { createdAt: { gte: start, lt: end } },
      }),
    ]);

  return (
    <UserCardsRowClient
      counts={{
        admin: adminCount,
        teacher: teacherCount,
        student: studentCount,
        parent: parentCount,
      }}
      selectedYearStart={yearStart}
    />
  );
}
