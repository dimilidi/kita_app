"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUnreadAnnouncementCountAction } from "@/lib/actions";
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
}: {
  unreadAnnouncementCount: number;
}) => {
  const { user } = useUser();
  const dict = useTranslations();
  const pathname = usePathname();
  const lang = getLangFromPathname(pathname);
  const [unread, setUnread] = useState(initialUnread);

  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  useEffect(() => {
    let cancelled = false;
    getUnreadAnnouncementCountAction().then((n) => {
      if (!cancelled) setUnread(n);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const announcementsHref = `/${lang}/list/announcements`;

  return (
    <div className="flex items-center justify-between p-4">
      {/* SEARCH BAR */}
      <div className="hidden md:flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2">
        <Image src="/search.png" alt="" width={14} height={14} />
        <input
          type="text"
          placeholder={dict.common.search}
          className="w-[200px] p-2 bg-transparent outline-none"
        />
      </div>
      {/* ICONS AND USER */}
      <div className="flex items-center gap-6 justify-end w-full">
        <div className="hidden lg:block">
          <LanguageSwitcher />
        </div>
        <div className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer">
          <Image src="/message.png" alt="" width={20} height={20} />
        </div>
        <Link
          href={announcementsHref}
          className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer relative"
          title={dict.menu.announcements}
          aria-label={dict.menu.announcements}
        >
          <Image src="/announcement.png" alt="" width={20} height={20} />
          {unread > 0 ? (
            <div className="absolute -top-3 -right-3 min-w-[1.25rem] h-5 px-1 flex items-center justify-center bg-purple-500 text-white rounded-full text-[10px] font-semibold leading-none">
              {unread > 99 ? "99+" : unread}
            </div>
          ) : null}
        </Link>
        <div className="flex flex-col">
          <span className="text-xs leading-3 font-medium">
            {user?.firstName ?? user?.username ?? ""}
          </span>
          <span className="text-[10px] text-gray-500 text-right">
            {user?.publicMetadata?.role as string}
          </span>
        </div>
        {/* <Image src="/avatar.png" alt="" width={36} height={36} className="rounded-full"/> */}
        <UserButton />
      </div>
    </div>
  );
};

export default Navbar;