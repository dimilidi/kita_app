"use client";

import Link from "next/link";
import EventCalendar from "./EventCalendar";
import { DEFAULT_LOCALE } from "@/i18n/lang";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { usePathname } from "next/navigation";

type DashboardEventCard = {
  id: number;
  title: string;
  description: string;
  dateISO: string;
  variantIndex: 0 | 1 | 2;
};

export default function DashboardEventsClient({
  cards,
}: {
  cards: DashboardEventCard[];
}) {
  const dict = useTranslations();
  const pathname = usePathname();
  const langSeg = pathname.split("/").filter(Boolean)[0];
  const lang =
    langSeg === "en" || langSeg === "de" ? langSeg : DEFAULT_LOCALE;
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
        {cards.map((card) => (
          <div
            key={card.id}
            className={`${getVariantClass(card.variantIndex)} rounded-md p-4`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{card.title}</h2>
              <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                {new Intl.DateTimeFormat("en-GB").format(
                  new Date(card.dateISO)
                )}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
