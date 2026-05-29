export const ITEM_PER_PAGE = 10

type RouteAccessMap = {
  [key: string]: string[];
};

export const routeAccessMap: RouteAccessMap = {
  "/admin(.*)": ["admin"],
  "/student(.*)": ["student"],
  "/teacher(.*)": ["teacher"],
  "/parent(.*)": ["parent"],
  "/list/teachers(.*)": ["admin", "teacher"],
  "/list/parents(.*)": ["admin", "teacher"],
  // List + detail; per-record ownership enforced in pageAccess + detail pages.
  "/list/students(.*)": ["admin", "teacher", "student", "parent"],
  "/list/classes(.*)": ["admin", "teacher"],
  "/list/lessons(.*)": ["admin", "teacher"],
  "/list/teachers-attendance(.*)": ["admin", "teacher"],
  "/list/attendance(.*)": ["admin", "teacher", "student", "parent"],
  "/list/events(.*)": ["admin", "teacher", "student", "parent"],
  "/list/announcements(.*)": ["admin", "teacher", "student", "parent"],
  "/list/areas(.*)": ["admin", "teacher"],
  "/list/lunch(.*)": ["admin", "teacher"],
  "/list/lunch-groups(.*)": ["admin", "teacher"],
  "/list/tischsprueche(.*)": ["admin", "teacher"],
  "/list/admins(.*)": ["admin"],
  "/list/messages(.*)": ["admin", "teacher"],
};