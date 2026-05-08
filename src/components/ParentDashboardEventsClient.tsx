"use client";

import Link from "next/link";
import EventCalendar from "@/components/EventCalendar";
import { DEFAULT_LOCALE } from "@/i18n/lang";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { usePathname } from "next/navigation";

type ParentDashboardEventCard = {
  id: number;
  title: string;
  description: string;
  dateISO: string;
  isGlobal: boolean;
  relatedChildren: string[];
  variantIndex: 0 | 1 | 2;
};

export default function ParentDashboardEventsClient({
  cards,
}: {
  cards: ParentDashboardEventCard[];
}) {
  const dict = useTranslations();
  const pathname = usePathname();
  const langSeg = pathname.split("/").filter(Boolean)[0];
  const lang = langSeg === "en" || langSeg === "de" ? langSeg : DEFAULT_LOCALE;
  const eventsHref = `/${lang}/list/events`;

  const getVariantClass = (variantIndex: number) => {
    switch (variantIndex) {
      case 0:
        return "bg-kitaSkyLight";
      case 1:
        return "bg-kitaPurpleLight";
      case 2:
        return "bg-kitaYellowLight";
      default:
        return "bg-kitaSkyLight";
    }
  };

  const intlLocale = lang === "de" ? "de-DE" : "en-GB";

  return (
    <div className="bg-white p-4 rounded-md">
      <EventCalendar />

      <div className="flex items-center justify-between mt-4">
        <h1 className="text-xl font-semibold">{dict.events.title}</h1>
        <Link
          href={eventsHref}
          className="text-xs font-medium text-gray-500 hover:text-gray-800 hover:underline"
        >
          {dict.events.viewAll}
        </Link>
      </div>

      <div className="flex flex-col gap-4 mt-4">
        {cards.length === 0 ? (
          <div className="text-sm text-gray-500">
            {dict.dashboard?.parentEventsEmpty ??
              "No upcoming events for your children."}
          </div>
        ) : (
          cards.map((card) => {
            const relatedLine =
              card.relatedChildren.length > 0
                ? `${dict.dashboard?.parentEventRelatedTo ?? "Related to"}: ${card.relatedChildren.join(", ")}`
                : null;

            return (
              <div
                key={card.id}
                className={`${getVariantClass(card.variantIndex)} rounded-md p-4`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-medium break-words">{card.title}</h2>
                  <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1 shrink-0">
                    {new Intl.DateTimeFormat(intlLocale).format(
                      new Date(card.dateISO)
                    )}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1 break-words">
                  {card.description}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {card.isGlobal ? (
                    <span className="inline-flex items-center rounded-md bg-white/80 px-2 py-1 text-[11px] font-medium text-gray-700 border border-gray-200">
                      {dict.dashboard?.parentEventKindergartenBadge ??
                        "Kindergarten Event"}
                    </span>
                  ) : null}

                  {relatedLine ? (
                    <span className="text-[11px] text-gray-600">
                      {relatedLine}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

