// IT APPEARS THAT BIG CALENDAR SHOWS THE LAST WEEK WHEN THE CURRENT DAY IS A WEEKEND.
// FOR THIS REASON WE'LL GET THE LAST WEEK AS THE REFERENCE WEEK.

import { auth } from "@clerk/nextjs/server";

//  const { userId, sessionClaims } = auth();
 
// export const role = (sessionClaims?.metadata as { role?: string })?.role;
// export const currentUserId = userId;

export const getAuthData = () => {
  const { userId, sessionClaims } = auth();

  const claims = sessionClaims as any;
  const role =
    (claims?.metadata as { role?: string } | undefined)?.role ??
    (claims?.publicMetadata as { role?: string } | undefined)?.role ??
    (claims?.user?.publicMetadata as { role?: string } | undefined)?.role ??
    null;

  return { userId, role };
};

export { adjustScheduleToCurrentWeek, getLatestMonday } from "./calendarSchedule";