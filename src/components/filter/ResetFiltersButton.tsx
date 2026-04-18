"use client";

import { resetListQueryParams } from "@/lib/listUrl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function ResetFiltersButton({ label = "Reset" }: { label?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <button
      className="rounded-md bg-slate-200 px-3 py-2 text-xs font-semibold text-gray-700"
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
      {label}
    </button>
  );
}

