import prisma from "@/lib/prisma";
import { canViewParentProfile, getViewerContext } from "@/lib/pageAccess";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, Locale } from "@/i18n/lang";
import { getDictionary } from "@/i18n/getDictionary";
import Image from "next/image";
import Link from "next/link";

export default async function SingleParentPage({
  params: { id },
}: {
  params: { id: string };
}) {
  const viewer = getViewerContext();
  const { role } = viewer;
  const cookieLang = cookies().get("NEXT_LANG")?.value as Locale | undefined;
  const lang = cookieLang ?? DEFAULT_LOCALE;
  const dict = getDictionary(lang) as any;

  if (!(await canViewParentProfile(viewer, id))) {
    return notFound();
  }

  const parent = await prisma.parent.findUnique({
    where: { id },
    include: {
      students: {
        select: { id: true, name: true, surname: true, class: { select: { name: true } } },
      },
    },
  });

  if (!parent) {
    return notFound();
  }

  return (
    <div className="flex-1 p-4">
      <div className="bg-kitaSky py-6 px-4 rounded-md max-w-3xl flex gap-4">
        <div className="w-1/4 flex items-start justify-center">
          <Image src="/noAvatar.png" alt="" width={120} height={120} className="rounded-full" />
        </div>
        <div className="flex-1 flex flex-col gap-3">
          <h1 className="text-xl font-semibold">
            {parent.name} {parent.surname}
          </h1>
          <p className="text-sm text-gray-500">{dict.common.about}</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Image src="/mail.png" alt="" width={14} height={14} />
              <span>{parent.email || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Image src="/phone.png" alt="" width={14} height={14} />
              <span>{parent.phone}</span>
            </div>
          </div>

          <div className="mt-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              {dict.menu.students}
            </h2>
            <ul className="flex flex-col gap-2">
              {parent.students.map((child) => (
                <li key={child.id}>
                  <Link
                    className="text-kitaSky underline text-sm"
                    href={`/list/students/${child.id}`}
                  >
                    {child.name} {child.surname}
                    {child.class?.name ? ` · ${child.class.name}` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {(role === "admin" || role === "teacher") && (
            <Link
              href="/list/parents"
              className="text-xs text-gray-500 hover:underline mt-2"
            >
              ← {dict.parents.titleAll}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
