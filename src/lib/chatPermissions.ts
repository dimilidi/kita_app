export const STAFF_CHAT_ROLES = ["admin", "teacher"] as const;

export type StaffChatRole = (typeof STAFF_CHAT_ROLES)[number];

export function canAccessStaffChat(
  role: string | null | undefined
): role is StaffChatRole {
  return role === "admin" || role === "teacher";
}
