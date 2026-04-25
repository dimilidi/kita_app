"use client";

import { resetListQueryParams } from "@/lib/listUrl";
import { LIST_ICON_BUTTON_CLASS } from "@/components/list/listToolbarStyles";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function ResetFiltersButton({
  label = "Reset filters",
}: {
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hasActiveFilters = (() => {
    const current = new URLSearchParams(searchParams.toString());
    // resetListQueryParams keeps only scope params; if resetting would change the URL,
    // that means the user currently has active list params (filters/search/sort/paging).
    const resetUrl = resetListQueryParams(current, pathname);
    const currentUrl = current.toString() ? `${pathname}?${current}` : pathname;
    return resetUrl !== currentUrl;
  })();

  if (!hasActiveFilters) return null;

  return (
    <button
      className={`${LIST_ICON_BUTTON_CLASS} text-gray-700`}
      aria-label={label}
      title={label}
      onClick={() => {
        const url = resetListQueryParams(
          new URLSearchParams(searchParams.toString()),
          pathname
        );
        router.push(url);
        router.refresh();
      }}
      type="button"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-[14px] w-[14px]"
        aria-hidden="true"
      >
        <path d="M10 3a7 7 0 1 1-6.3 4H2.75a.75.75 0 0 1-.53-1.28l2.5-2.5a.75.75 0 0 1 1.06 0l2.5 2.5A.75.75 0 1 1 7.22 7H5.3A5.5 5.5 0 1 0 10 4.5c-.72 0-1.41.14-2.04.38a.75.75 0 1 1-.54-1.4A7 7 0 0 1 10 3Z" />
      </svg>
    </button>
  );
}

