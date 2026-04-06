import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getAuthData } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import LunchGroupsManager from "./LunchGroupsManager";
import type { LunchGroupPdfSection } from "@/types/lunchGroups";

const LunchGroupsPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { role } = getAuthData();
  const { search, page, sort, filter } = searchParams;
  const p = Math.max(1, page ? parseInt(page, 10) : 1);

  const sortKey = sort ?? "name_asc";
  const filterKey = filter ?? "all";

  const searchWhere: Prisma.LunchGroupEntityWhereInput = {};
  if (search?.trim()) {
    searchWhere.name = { contains: search.trim(), mode: "insensitive" };
  }

  if (filterKey === "with_children") {
    searchWhere.assignments = { some: {} };
  }

  const orderBy: Prisma.LunchGroupEntityOrderByWithRelationInput =
    sortKey === "name_desc"
      ? { name: "desc" }
      : sortKey === "capacity_asc"
        ? { capacity: "asc" }
        : sortKey === "capacity_desc"
          ? { capacity: "desc" }
          : { name: "asc" };

  let rows = await prisma.lunchGroupEntity.findMany({
    where: searchWhere,
    orderBy,
    include: {
      _count: { select: { assignments: true } },
    },
  });

  if (filterKey === "with_space") {
    rows = rows.filter(
      (g) => g._count.assignments < (g.capacity ?? 15)
    );
  }

  const total = rows.length;
  const slice = rows.slice(ITEM_PER_PAGE * (p - 1), ITEM_PER_PAGE * p);
  const data = slice.map(({ _count, ...rest }) => rest);

  const [exportGroups, tischsprueche] = await Promise.all([
    prisma.lunchGroupEntity.findMany({
      orderBy: { name: "asc" },
      include: {
        assignments: {
          include: {
            student: { include: { class: true } },
          },
        },
        teacherAssignments: {
          include: {
            teacher: { select: { name: true, surname: true } },
          },
        },
        votes: { select: { tischspruchId: true } },
      },
    }),
    prisma.tischspruch.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const winningTischspruchTitle = (
    votes: { tischspruchId: number }[]
  ): string | null => {
    if (tischsprueche.length === 0) return null;
    const counts = new Map<number, number>();
    for (const v of votes) {
      counts.set(
        v.tischspruchId,
        (counts.get(v.tischspruchId) ?? 0) + 1
      );
    }
    const winner = tischsprueche.reduce((best, opt) => {
      const cv = counts.get(opt.id) ?? 0;
      const bv = counts.get(best.id) ?? 0;
      return cv > bv ? opt : best;
    }, tischsprueche[0]);
    return winner.title;
  };

  const exportSections: LunchGroupPdfSection[] = exportGroups.map((g) => ({
    groupName: g.name,
    capacity: g.capacity,
    educatorNames: g.teacherAssignments
      .map((a) =>
        `${a.teacher.name} ${a.teacher.surname}`.trim()
      )
      .sort((a, b) => a.localeCompare(b)),
    tischspruchTitle: winningTischspruchTitle(g.votes),
    children: [...g.assignments]
      .map((a) => a.student)
      .filter(Boolean)
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name) || a.surname.localeCompare(b.surname)
      )
      .map((s) => ({
        name: `${s.name} ${s.surname}`.trim(),
        className: s.class.name,
      })),
  }));

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <LunchGroupsManager
        initialItems={data}
        count={total}
        page={p}
        canManage={role === "admin" || role === "teacher"}
        search={search?.trim() ?? ""}
        sort={sortKey}
        filter={filterKey}
        exportSections={exportSections}
      />
    </div>
  );
};

export default LunchGroupsPage;
