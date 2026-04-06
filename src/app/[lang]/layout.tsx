import type { Metadata } from "next";
import { DEFAULT_LOCALE, Locale } from "@/i18n/lang";
import { getDictionary } from "@/i18n/getDictionary";
import { TranslationsProvider } from "@/i18n/TranslationsProvider";

export const metadata: Metadata = {
  title: "Kita Management Dashboard",
  description: "Next.js Kita Management System",
};

export default function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { lang?: string };
}>) {
  const lang = (params.lang && ["de", "en"].includes(params.lang)
    ? (params.lang as Locale)
    : DEFAULT_LOCALE) as Locale;

  const dict = getDictionary(lang);

  return <TranslationsProvider dict={dict}>{children}</TranslationsProvider>;
}

