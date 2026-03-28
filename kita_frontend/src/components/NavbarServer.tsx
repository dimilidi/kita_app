import { getUnreadAnnouncementCount } from "@/lib/announcementUnread";
import Navbar from "./Navbar";

export default async function NavbarServer() {
  const unreadAnnouncementCount = await getUnreadAnnouncementCount();
  return (
    <Navbar unreadAnnouncementCount={unreadAnnouncementCount} />
  );
}
