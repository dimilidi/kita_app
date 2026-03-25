"use client";

import Image from "next/image";
import { useTranslations } from "@/i18n/TranslationsProvider";
import EventCalendar from "./EventCalendar";

type CalendarEvent = {
  id: number | string;
  title: string;
  description: string;
  startTimeISO: string;
};

export default function EventCalendarContainerClient({
  events,
}: {
  events: CalendarEvent[];
}) {
  const dict = useTranslations();

  return (
    <div className="bg-white p-4 rounded-md">
      <EventCalendar />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold my-4">{dict.events.title}</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>

      <div className="flex flex-col gap-4">
        {events.map((event) => (
          <div
            className="p-5 rounded-md border-2 border-gray-100 border-t-4 odd:border-t-kitaSky even:border-t-kitaPurple"
            key={event.id}
          >
            <div className="flex items-center justify-between">
              <h1 className="font-semibold text-gray-600">
                {event.title}
              </h1>
              <span className="text-gray-300 text-xs">
                {new Date(event.startTimeISO).toLocaleTimeString("en-UK", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>
            </div>
            <p className="mt-2 text-gray-400 text-sm">{event.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

