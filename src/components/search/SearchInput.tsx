"use client";

import { buildListUrl } from "@/lib/listUrl";
import { useTranslations } from "@/i18n/TranslationsProvider";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type SearchInputProps = {
  /** Query param name, defaults to `search`. */
  paramKey?: string;
  /** Debounce in ms. */
  debounceMs?: number;
  /** Optional placeholder override. */
  placeholder?: string;
  className?: string;
};

export default function SearchInput({
  paramKey = "search",
  debounceMs = 300,
  placeholder,
  className,
}: SearchInputProps) {
  const dict = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initial = useMemo(() => searchParams.get(paramKey) ?? "", [searchParams, paramKey]);
  const [value, setValue] = useState(initial);
  const lastPushedRef = useRef(initial);

  // Keep input in sync with URL (back/forward navigation).
  useEffect(() => {
    setValue(initial);
    lastPushedRef.current = initial;
  }, [initial]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const trimmed = value.trim();
      if (trimmed === lastPushedRef.current) return;
      lastPushedRef.current = trimmed;
      const nextUrl = buildListUrl(
        pathname,
        new URLSearchParams(searchParams.toString()),
        { [paramKey]: trimmed || null },
        { resetPage: true }
      );
      router.push(nextUrl);
    }, debounceMs);
    return () => window.clearTimeout(t);
  }, [value, debounceMs, pathname, router, searchParams, paramKey]);

  return (
    <div
      className={
        className ??
        "w-full md:w-auto flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2"
      }
    >
      <Image src="/search.png" alt="" width={14} height={14} />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? dict.common.search}
        className="w-[200px] p-2 bg-transparent outline-none"
      />
    </div>
  );
}

