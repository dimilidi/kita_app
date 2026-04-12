// IT APPEARS THAT BIG CALENDAR SHOWS THE LAST WEEK WHEN THE CURRENT DAY IS A WEEKEND.
// FOR THIS REASON WE'LL GET THE LAST WEEK AS THE REFERENCE WEEK.

import { auth } from "@clerk/nextjs/server";

//  const { userId, sessionClaims } = auth();
 
// export const role = (sessionClaims?.metadata as { role?: string })?.role;
// export const currentUserId = userId;

export const getAuthData = () => {
  const { userId, sessionClaims } = auth();

  const role =
    (sessionClaims?.metadata as { role?: string })?.role ?? null;

  return { userId, role };
};

export { adjustScheduleToCurrentWeek, getLatestMonday } from "./calendarSchedule";