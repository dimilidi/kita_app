// src/i18n/getLocaleFromPathname.ts

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, Locale } from "./lang";

export const getLocaleFromPathname = (pathname: string): Locale => {
  if (!pathname) return DEFAULT_LOCALE;

  const segments = pathname.split("/");
  const lang = segments[1];

  if (SUPPORTED_LOCALES.includes(lang as Locale)) {
    return lang as Locale;
  }

  return DEFAULT_LOCALE;
};