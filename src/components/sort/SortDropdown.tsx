"use client";

import { useOptionalSortPanelClose } from "@/components/list/panelCloseContexts";
import { buildListUrl } from "@/lib/listUrl";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type SortFieldOption = { label: string; value: string };

type SortDropdownProps = {
  options: SortFieldOption[];
  defaultSort?: string;
  defaultOrder?: "asc" | "desc";
  className?: string;
};

export default function SortDropdown({
  options,
  defaultSort,
  defaultOrder = "asc",
  className,
}: SortDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dict = useTranslations();
  const closeSortPanel = useOptionalSortPanelClose();

  const sort = searchParams.get("sort") ?? defaultSort ?? "";
  const order = (searchParams.get("order") as "asc" | "desc" | null) ?? defaultOrder;

  return (
    <div className={className ?? "flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:gap-2"}>
      <span className="text-gray-500">{dict.common.sortBy ?? "Sort"}</span>
      <select
        value={sort}
        onChange={(e) => {
          const v = e.target.value;
          const nextUrl = buildListUrl(
            pathname,
            new URLSearchParams(searchParams.toString()),
            { sort: v || null, order: v ? order : null },
            { resetPage: true }
          );
          router.push(nextUrl);
          closeSortPanel?.();
        }}
        className="rounded-md border border-gray-300 bg-white px-2 py-2 text-xs outline-none"
      >
        <option value="">{dict.common.defaultSort ?? "Default"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={order}
        onChange={(e) => {
          const next = e.target.value as "asc" | "desc";
          const nextUrl = buildListUrl(
            pathname,
            new URLSearchParams(searchParams.toString()),
            { order: next, sort: sort || null },
            { resetPage: true }
          );
          router.push(nextUrl);
          closeSortPanel?.();
        }}
        className="rounded-md border border-gray-300 bg-white px-2 py-2 text-xs outline-none"
        disabled={!sort}
      >
        <option value="asc">{dict.common.asc ?? "Asc"}</option>
        <option value="desc">{dict.common.desc ?? "Desc"}</option>
      </select>
    </div>
  );
}

