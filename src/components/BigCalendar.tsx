"use client";

import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useMemo, useState } from "react";
import {
  adjustScheduleToCurrentWeek,
  getLatestMonday,
} from "@/lib/calendarSchedule";

const localizer = momentLocalizer(moment);

const BigCalendar = ({
  data,
}: {
  /** Server Components serialize Dates to ISO strings — normalize to Date for RBC. */
  data: { title: string; start: Date | string; end: Date | string }[];
}) => {
  const [view, setView] = useState<View>(Views.WEEK);

  const events = useMemo(() => {
    const parsed = data.map((e) => ({
      title: e.title,
      start: e.start instanceof Date ? e.start : new Date(e.start),
      end: e.end instanceof Date ? e.end : new Date(e.end),
    }));
    return adjustScheduleToCurrentWeek(parsed);
  }, [data]);

  const [date, setDate] = useState(() => getLatestMonday());

  const { min, max } = useMemo(() => {
    const base = new Date();
    const minD = new Date(base);
    minD.setHours(7, 0, 0, 0);
    const maxD = new Date(base);
    maxD.setHours(20, 0, 0, 0);
    return { min: minD, max: maxD };
  }, []);

  const scrollToTime = useMemo(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  }, []);

  const handleOnChangeView = (selectedView: View) => {
    setView(selectedView);
  };

  return (
    <Calendar
      localizer={localizer}
      culture="en-GB"
      events={events}
      startAccessor="start"
      endAccessor="end"
      views={["week", "work_week", "day"]}
      view={view}
      date={date}
      onNavigate={(newDate) => setDate(newDate)}
      scrollToTime={scrollToTime}
      style={{ height: "98%" }}
      onView={handleOnChangeView}
      min={min}
      max={max}
    />
  );
};

export default BigCalendar;
