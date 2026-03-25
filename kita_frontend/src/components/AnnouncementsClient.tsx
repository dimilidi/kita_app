"use client";

import { useTranslations } from "@/i18n/TranslationsProvider";

type AnnouncementCard = {
  title: string;
  description: string;
  dateISO: string; // serialize-friendly
  variantIndex: 0 | 1 | 2;
};

export default function AnnouncementsClient({
  cards,
}: {
  cards: AnnouncementCard[];
}) {
  const dict = useTranslations();

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{dict.announcements.title}</h1>
        <span className="text-xs text-gray-400">{dict.announcements.viewAll}</span>
      </div>
      <div className="flex flex-col gap-4 mt-4">
        {cards.map((card) => (
          <div
            key={card.title + card.dateISO + card.variantIndex}
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

