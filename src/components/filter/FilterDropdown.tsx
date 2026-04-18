"use client";

import { useOptionalFilterPanelClose } from "@/components/list/panelCloseContexts";
import { buildListUrl } from "@/lib/listUrl";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type FilterOption = { label: string; value: string };

type FilterDropdownProps = {
  label: string;
  paramKey: string;
  options: FilterOption[];
  className?: string;
  /** If true, shows an empty option to clear filter. */
  allowClear?: boolean;
};

export default function FilterDropdown({
  label,
  paramKey,
  options,
  className,
  allowClear = true,
}: FilterDropdownProps) {
  const dict = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const closeFilterPanel = useOptionalFilterPanelClose();

  const current = searchParams.get(paramKey) ?? "";

  return (
    <label className={className ?? "flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-2"}>
      <span className="text-gray-500">{label}</span>
      <select
        value={current}
        onChange={(e) => {
          const nextUrl = buildListUrl(
            pathname,
            new URLSearchParams(searchParams.toString()),
            { [paramKey]: e.target.value || null },
            { resetPage: true }
          );
          router.push(nextUrl);
          closeFilterPanel?.();
        }}
        className="rounded-md border border-gray-300 bg-white px-2 py-2 text-xs outline-none"
      >
        {allowClear ? <option value="">{dict.common.all}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

