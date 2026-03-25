import { redirect } from "next/navigation";
import { DEFAULT_LOCALE, Locale } from "@/i18n/lang";

export default function LangRootPage({
  params,
}: {
  params: { lang?: string };
}) {
  const lang = (params.lang && ["de", "en"].includes(params.lang)
    ? (params.lang as Locale)
    : DEFAULT_LOCALE) as Locale;

  redirect(`/${lang}/admin`);
}

