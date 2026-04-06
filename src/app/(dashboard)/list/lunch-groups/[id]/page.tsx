import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import LunchGroupDetailClient, {
  type LunchGroupDetailData,
} from "./LunchGroupDetailClient";

export default async function LunchGroupDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const group = await prisma.lunchGroupEntity.findUnique({
    where: { id: params.id },
    include: {
      assignments: {
        include: {
          student: { include: { class: true } },
        },
      },
      teacherAssignments: {
        include: {
          teacher: {
            select: { id: true, name: true, surname: true, img: true },
          },
        },
      },
    },
  });

  if (!group) {
    notFound();
  }

  const children = group.assignments
    .map((a) => a.student)
    .filter(Boolean)
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name) || a.surname.localeCompare(b.surname)
    )
    .map((s) => ({
      id: s.id,
      name: s.name,
      surname: s.surname,
      img: s.img,
      className: s.class.name,
    }));

  const educators = group.teacherAssignments
    .map((a) => a.teacher)
    .filter(Boolean)
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name) || a.surname.localeCompare(b.surname)
    )
    .map((t) => ({
      id: t.id,
      name: t.name,
      surname: t.surname,
      img: t.img,
    }));

  const studentIds = children.map((c) => c.id);

  const [tischsprueche, lunchVotesForGroup] = await Promise.all([
    prisma.tischspruch.findMany({
      orderBy: { createdAt: "asc" },
    }),
    studentIds.length > 0
      ? prisma.studentLunchVote.findMany({
          where: {
            groupId: group.id,
            studentId: { in: studentIds },
          },
        })
      : [],
  ]);

  const votes: Record<number, number> = Object.fromEntries(
    tischsprueche.map((t) => [t.id, 0])
  );
  const childVoteTischspruchId: Record<string, number> = {};
  for (const v of lunchVotesForGroup) {
    childVoteTischspruchId[v.studentId] = v.tischspruchId;
    if (votes[v.tischspruchId] !== undefined) {
      votes[v.tischspruchId]++;
    }
  }

  const data: LunchGroupDetailData = {
    id: group.id,
    name: group.name,
    color: group.color,
    capacity: group.capacity,
    createdAt: group.createdAt.toISOString(),
    children,
    educators,
    tischsprueche: tischsprueche.map((t) => ({
      id: t.id,
      title: t.title,
      text: t.text,
    })),
    tischspruchVotes: votes,
    childVoteTischspruchId,
  };

  return <LunchGroupDetailClient data={data} />;
}
