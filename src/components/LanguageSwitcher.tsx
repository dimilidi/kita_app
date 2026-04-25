"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Locale, SUPPORTED_LOCALES } from "@/i18n/lang";

const SUPPORTED = SUPPORTED_LOCALES;

function getCurrentLocale(pathname: string): Locale {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (SUPPORTED.includes(seg as Locale)) return seg as Locale;
  return "de";
}

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentLocale = useMemo(
    () => getCurrentLocale(pathname),
    [pathname]
  );

  const restPath = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    // segments[0] is locale
    return segments.slice(1).join("/") ? `/${segments.slice(1).join("/")}` : "";
  }, [pathname]);

  const query = searchParams.toString();
  const querySuffix = query ? `?${query}` : "";

  const goTo = (nextLocale: Locale) => {
    const nextPath = `/${nextLocale}${restPath}${querySuffix}`;
    document.cookie = `NEXT_LANG=${nextLocale}; path=/; max-age=31536000`;
    router.push(nextPath);
  };

  return (
    <div className="flex items-center gap-2">
      {(["de", "en"] as const).map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => goTo(loc)}
          className={
            loc === currentLocale
              ? "text-xs font-semibold rounded-full bg-kitaSky px-2 py-1 sm:px-3"
              : "text-xs rounded-full bg-white px-2 py-1 hover:bg-gray-50 sm:px-3"
          }
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

