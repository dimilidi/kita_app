"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getUnreadAnnouncementCountAction,
  getUnreadStaffChatCountAction,
} from "@/lib/actions";
import { DEFAULT_LOCALE } from "@/i18n/lang";
import LanguageSwitcher from "./LanguageSwitcher";

import { useTranslations } from "@/i18n/TranslationsProvider";

const getLangFromPathname = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  const maybe = segments[0];
  if (maybe === "en" || maybe === "de") return maybe;
  return DEFAULT_LOCALE;
};

const Navbar = ({
  unreadAnnouncementCount: initialUnread,
  unreadStaffChatCount: initialChatUnread,
}: {
  unreadAnnouncementCount: number;
  unreadStaffChatCount: number;
}) => {
  const { user } = useUser();
  const dict = useTranslations();
  const pathname = usePathname();
  const lang = getLangFromPathname(pathname);
  const [unread, setUnread] = useState(initialUnread);
  const [chatUnread, setChatUnread] = useState(initialChatUnread);

  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  useEffect(() => {
    setChatUnread(initialChatUnread);
  }, [initialChatUnread]);

  useEffect(() => {
    let cancelled = false;
    getUnreadAnnouncementCountAction().then((n) => {
      if (!cancelled) setUnread(n);
    });
    getUnreadStaffChatCountAction().then((n) => {
      if (!cancelled) setChatUnread(n);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const announcementsHref = `/${lang}/list/announcements`;
  const messagesHref = `/${lang}/list/messages`;
  const role = user?.publicMetadata?.role as string | undefined;
  const showStaffChatIcon = role === "admin" || role === "teacher";

  return (
    <div className="flex items-center justify-end gap-6 p-4">
      <div className="hidden lg:block">
        <LanguageSwitcher />
      </div>
      {showStaffChatIcon ? (
        <Link
          href={messagesHref}
          className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white"
          title={dict.menu.messages}
          aria-label={dict.menu.messages}
        >
          <Image src="/message.png" alt="" width={20} height={20} />
          {chatUnread > 0 ? (
            <div className="absolute -top-3 -right-3 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-purple-500 px-1 text-[10px] font-semibold leading-none text-white">
              {chatUnread > 99 ? "99+" : chatUnread}
            </div>
          ) : null}
        </Link>
      ) : null}
      <Link
        href={announcementsHref}
        className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white"
        title={dict.menu.announcements}
        aria-label={dict.menu.announcements}
      >
        <Image src="/announcement.png" alt="" width={20} height={20} />
        {unread > 0 ? (
          <div className="absolute -top-3 -right-3 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-purple-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </div>
        ) : null}
      </Link>
      <div className="flex flex-col">
        <span className="text-xs leading-3 font-medium">
          {user?.firstName ?? user?.username ?? ""}
        </span>
        <span className="text-right text-[10px] text-gray-500">
          {user?.publicMetadata?.role as string}
        </span>
      </div>
      {/* <Image src="/avatar.png" alt="" width={36} height={36} className="rounded-full"/> */}
      <UserButton />
    </div>
  );
};

export default Navbar;