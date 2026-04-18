import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/lang";
import { getDictionary } from "@/i18n/getDictionary";
import { redirect } from "next/navigation";

export default async function AdminsListPage() {
  const { role } = getAuthData();
  if (role !== "admin") {
    redirect(`/${DEFAULT_LOCALE}`);
  }

  const cookieLang = cookies().get("NEXT_LANG")?.value as Locale | undefined;
  const lang = cookieLang ?? DEFAULT_LOCALE;
  const dict = getDictionary(lang) as Record<string, any>;

  const admins = await prisma.admin.findMany({
    orderBy: { username: "asc" },
    select: { id: true, username: true },
  });

  return (
    <div className="flex-1 p-4">
      <h1 className="text-xl font-semibold text-gray-800 mb-4">
        {dict.adminsList?.title ?? dict.entitiesPlural?.admin}
      </h1>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <ul className="divide-y divide-gray-100">
          {admins.length === 0 ? (
            <li className="p-6 text-sm text-gray-500 text-center">
              {dict.common?.noResults}
            </li>
          ) : (
            admins.map((a) => (
              <li
                key={a.id}
                className="px-4 py-3 text-sm text-gray-800 flex justify-between gap-4"
              >
                <span className="font-medium">{a.username}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
