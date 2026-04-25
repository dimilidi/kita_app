import { getUnreadAnnouncementCount } from "@/lib/announcementUnread";
import { getUnreadStaffChatCount } from "@/lib/staffChatUnread";
import Navbar from "./Navbar";

export default async function NavbarServer() {
  const unreadAnnouncementCount = await getUnreadAnnouncementCount();
  const unreadStaffChatCount = await getUnreadStaffChatCount();
  return (
    <Navbar
      unreadAnnouncementCount={unreadAnnouncementCount}
      unreadStaffChatCount={unreadStaffChatCount}
    />
  );
}
