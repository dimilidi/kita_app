"use client";

import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_LOCALE } from "@/i18n/lang";
import { useTranslations } from "@/i18n/TranslationsProvider";

const getLangFromPathname = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  const maybe = segments[0];
  if (maybe === "en" || maybe === "de") return maybe;
  return DEFAULT_LOCALE;
};

const Menu = () => {
  const pathname = usePathname();
  const lang = getLangFromPathname(pathname);
  const { user, isLoaded } = useUser();
  const role = user?.publicMetadata.role as string;
  const dict = useTranslations();

  if (!isLoaded) return null;

  const menuItems = [
    {
      title: dict.menu.menu,
      items: [
        {
          icon: "/home.png",
          label: dict.menu.home,
          href: `/${lang}/`,
          visible: ["admin", "teacher", "student", "parent"],
        },
        {
          icon: "/teacher.png",
          label: dict.menu.teachers,
          href: `/${lang}/list/teachers`,
          visible: ["admin", "teacher"],
        },
        {
          icon: "/student.png",
          label: dict.menu.students,
          href: `/${lang}/list/students`,
          visible: ["admin", "teacher"],
        },
        {
          icon: "/parent.png",
          label: dict.menu.parents,
          href: `/${lang}/list/parents`,
          visible: ["admin", "teacher"],
        },
        {
          icon: "/class.png",
          label: dict.menu.classes,
          href: `/${lang}/list/classes`,
          visible: ["admin", "teacher"],
        },
        {
          icon: "/lesson.png",
          label: dict.menu.lessons,
          href: `/${lang}/list/lessons`,
          visible: ["admin", "teacher"],
        },
        {
          icon: "/attendance.png",
          label: dict.menu.attendance,
          href: `/${lang}/list/attendance`,
          visible: ["admin", "teacher", "student", "parent"],
        },
        {
          icon: "/calendar.png",
          label: dict.menu.events,
          href: `/${lang}/list/events`,
          visible: ["admin", "teacher", "student", "parent"],
        },
        {
          icon: "/message.png",
          label: dict.menu.messages,
          href: `/${lang}/list/messages`,
          visible: ["admin", "teacher", "student", "parent"],
        },
        {
          icon: "/announcement.png",
          label: dict.menu.announcements,
          href: `/${lang}/list/announcements`,
          visible: ["admin", "teacher", "student", "parent"],
        },
        {
          icon: "/area.png",
          label: dict.menu.areas,
          href: `/${lang}/list/areas`,
          visible: ["admin", "teacher"],
        },
        {
          icon: "/lunch.png",
          label: dict.menu.lunch,
          href: `/${lang}/list/lunch-groups`,
          visible: ["admin", "teacher"],
        },
        {
          icon: "/class.png",
          label: dict.menu.lunchBoard,
          href: `/${lang}/list/lunch`,
          visible: ["admin", "teacher"],
        },
        {
          icon: "/message.png",
          label: dict.menu.tischsprueche,
          href: `/${lang}/list/tischsprueche`,
          visible: ["admin", "teacher"],
        },
      ],
    },
    {
      title: dict.menu.other,
      items: [
        {
          icon: "/profile.png",
          label: dict.menu.profile,
          href: `/${lang}/profile`,
          visible: ["admin", "teacher", "student", "parent"],
        },
        {
          icon: "/setting.png",
          label: dict.menu.settings,
          href: `/${lang}/settings`,
          visible: ["admin", "teacher", "student", "parent"],
        },
        {
          icon: "/logout.png",
          label: dict.menu.logout,
          href: `/${lang}/logout`,
          visible: ["admin", "teacher", "student", "parent"],
        },
      ],
    },
  ];
  return (
    <div className="mt-4 text-sm">
      {menuItems.map((i) => (
        <div className="flex flex-col gap-2" key={i.title}>
          <span className="hidden lg:block text-gray-400 font-light my-4">
            {i.title}
          </span>
          {i.items.map((item) => {
            if (item.visible.includes(role)) {
              return (
                <Link
                  href={item.href}
                  key={item.label}
                  className="flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lamaSkyLight"
                >
                  <Image src={item.icon} alt="" width={20} height={20} />
                  <span className="hidden lg:block">{item.label}</span>
                </Link>
              );
            }
          })}
        </div>
      ))}
    </div>
  );
};

export default Menu;