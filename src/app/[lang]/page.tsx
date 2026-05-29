import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { DEFAULT_LOCALE, Locale } from "@/i18n/lang";
import { defaultHomePath, resolveRoleFromClaims } from "@/lib/routeAccess";

export default function LangRootPage({
  params,
}: {
  params: { lang?: string };
}) {
  const lang = (params.lang && ["de", "en"].includes(params.lang)
    ? (params.lang as Locale)
    : DEFAULT_LOCALE) as Locale;

  const { sessionClaims, userId } = auth();
  if (!userId) {
    redirect(`/${lang}/sign-in`);
  }

  const role = resolveRoleFromClaims(sessionClaims);
  if (!role) {
    redirect(`/${lang}/sign-in`);
  }

  redirect(defaultHomePath(lang, role));
}
