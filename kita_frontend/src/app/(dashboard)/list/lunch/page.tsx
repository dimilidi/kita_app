import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import LunchBoardClient from "./LunchBoardClient";
import { Prisma } from "@prisma/client";

export default async function LunchPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const { role } = getAuthData();
  const query: Prisma.StudentWhereInput = {};
  const { search } = searchParams;

  if (search) {
    query.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { surname: { contains: search, mode: "insensitive" } },
    ];
  }

  const students = await prisma.student.findMany({
    where: query,
    include: { class: true },
    orderBy: { name: "asc" },
  });

  const lunchGroups = await (prisma as any).lunchGroupEntity.findMany({
    orderBy: { createdAt: "asc" },
  });

  const lunchAssignments = await prisma.studentLunchGroup.findMany();
  const initialGroups: Record<string, string[]> = { pool: [] };
  lunchGroups.forEach((group: { id: string }) => {
    initialGroups[group.id] = [];
  });

  lunchAssignments.forEach((assignment) => {
    const assignmentGroupId = (assignment as any).groupId as string | undefined;
    if (assignmentGroupId && initialGroups[assignmentGroupId]) {
      initialGroups[assignmentGroupId].push(assignment.studentId);
    }
  });

  const assignedStudents = new Set(lunchAssignments.map((item) => item.studentId));
  students.forEach((student) => {
    if (!assignedStudents.has(student.id)) {
      initialGroups.pool.push(student.id);
    }
  });

  const tischsprueche = await prisma.tischspruch.findMany({
    orderBy: { createdAt: "asc" },
  });

  const lunchVotes = await prisma.studentLunchVote.findMany();
  const initialVotes = Object.fromEntries(
    lunchVotes.map((vote) => [vote.studentId, vote.tischspruchId])
  );

  return (
    <div className="p-4">
      <LunchBoardClient
        students={students.map((student) => ({
          id: student.id,
          name: student.name,
          surname: student.surname,
          img: student.img ?? null,
          className: student.class.name,
        }))}
        initialGroups={initialGroups}
        lunchGroups={lunchGroups.map((group: any) => ({
          id: group.id,
          name: group.name,
          color: group.color ?? undefined,
          capacity: group.capacity ?? 15,
        }))}
        initialVotes={initialVotes}
        initialTischsprueche={tischsprueche}
        canManageTischsprueche={role === "admin" || role === "teacher"}
      />
    </div>
  );
}
