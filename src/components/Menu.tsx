"use client";

import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DEFAULT_LOCALE } from "@/i18n/lang";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { getProfileLinkAction } from "@/lib/actions";

const LUNCH_SUBMENU_ID = "lunch";
const PLAY_SUBMENU_ID = "play";
const ATTENDANCE_SUBMENU_ID = "attendance";

function isLunchSectionPath(pathname: string) {
  return (
    pathname.includes("/list/lunch") ||
    pathname.includes("/list/lunchboard") ||
    pathname.includes("/list/tischsprueche") ||
    pathname.includes("/list/lunch-groups")
  );
}

function isPlaySectionPath(pathname: string) {
  return pathname.includes("/list/areas");
}

function isAttendanceSectionPath(pathname: string) {
  return (
    pathname.includes("/list/attendance") &&
    !pathname.includes("/list/teachers-attendance")
  );
}

function isTeacherAttendancePath(pathname: string) {
  return pathname.includes("/list/teachers-attendance");
}

function isAttendanceMenuSectionPath(pathname: string) {
  return isAttendanceSectionPath(pathname) || isTeacherAttendancePath(pathname);
}

function isSubmenuParentActive(
  submenuId: string,
  pathname: string
): boolean {
  if (submenuId === LUNCH_SUBMENU_ID) return isLunchSectionPath(pathname);
  if (submenuId === PLAY_SUBMENU_ID) return isPlaySectionPath(pathname);
  if (submenuId === ATTENDANCE_SUBMENU_ID)
    return isAttendanceMenuSectionPath(pathname);
  return false;
}

function isSubmenuChildActive(
  pathname: string,
  href: string,
  exact?: boolean
): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

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

  const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(null);
  const [profileHref, setProfileHref] = useState<string | null>(null);
  const [profileRole, setProfileRole] = useState<"teacher" | "student" | null>(null);

  useEffect(() => {
    if (isLunchSectionPath(pathname)) {
      setOpenSubmenuId(LUNCH_SUBMENU_ID);
    } else if (isPlaySectionPath(pathname)) {
      setOpenSubmenuId(PLAY_SUBMENU_ID);
    } else if (isAttendanceMenuSectionPath(pathname)) {
      setOpenSubmenuId(ATTENDANCE_SUBMENU_ID);
    }
  }, [pathname]);

  useEffect(() => {
    if (!isLoaded) return;
    let alive = true;
    // Reset when auth user changes to avoid stale profile link.
    setProfileHref(null);
    setProfileRole(null);
    (async () => {
      try {
        const res = await getProfileLinkAction();
        if (!alive) return;
        setProfileHref(res.href);
        setProfileRole(res.role);
      } catch {
        // ignore (menu still works without Profile)
        if (!alive) return;
        setProfileHref(null);
        setProfileRole(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isLoaded, user?.id]);

  if (!isLoaded) return null;

  // Prefer server-derived role when available to avoid mixing sources.
  const effectiveRole = (profileRole ?? (role as string | null) ?? null) as string | null;
  const resolvedProfileHref = profileHref ? `/${lang}${profileHref}` : null;

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
          visible: ["admin", "teacher", "student", "parent"],
          submenuId: ATTENDANCE_SUBMENU_ID,
          children: [
            {
              label: dict.menu.childrenAttendance,
              href: `/${lang}/list/attendance`,
              visible: ["admin", "teacher", "student", "parent"],
            },
            {
              label: dict.menu.educatorAttendance,
              href: `/${lang}/list/teachers-attendance`,
              visible: ["admin", "teacher"],
            },
          ],
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
          visible: ["admin", "teacher"],
        },
        {
          icon: "/announcement.png",
          label: dict.menu.announcements,
          href: `/${lang}/list/announcements`,
          visible: ["admin", "teacher", "student", "parent"],
        },
        {
          icon: "/area.png",
          label: dict.menu.play,
          visible: ["admin", "teacher"],
          submenuId: PLAY_SUBMENU_ID,
          children: [
            {
              label: dict.menu.areas,
              href: `/${lang}/list/areas`,
              exact: true,
            },
            {
              label: dict.menu.playBoard,
              href: `/${lang}/list/areas/board`,
            },
          ],
        },
        {
          icon: "/lunch.png",
          label: dict.menu.lunch,
          visible: ["admin", "teacher"],
          submenuId: LUNCH_SUBMENU_ID,
          children: [
            {
              label: dict.menu.lunchGroups,
              href: `/${lang}/list/lunch-groups`,
            },
            {
              label: dict.menu.lunchBoard,
              href: `/${lang}/list/lunch`,
            },
            {
              label: dict.menu.tischsprueche,
              href: `/${lang}/list/tischsprueche`,
            },
          ],
        },
      ],
    },
    {
      title: dict.menu.other,
      items: [
        ...(profileHref && resolvedProfileHref
          ? [
              {
                isProfile: true,
                icon: "/profile.png",
                label: dict.menu.profile,
                href: resolvedProfileHref,
                visible: ["teacher", "student"],
              },
            ]
          : []),
      ],
    },
  ];
  return (
    <div className="mt-4 text-sm">
      {menuItems
        .filter((section) => section.items.length > 0)
        .map((i) => (
        <div className="flex flex-col gap-2" key={i.title}>
          <span className="hidden lg:block text-gray-400 font-light my-4">
            {i.title}
          </span>
          {i.items.map((item) => {
            // Profile is server-resolved + DB-validated; don't hide it due to client role mismatches.
            const isResolvedProfile =
              !!resolvedProfileHref && item.href === resolvedProfileHref;

            if (!isResolvedProfile) {
              if (!effectiveRole || !item.visible.includes(effectiveRole)) return null;
            }

            if ("children" in item && item.children) {
              const expanded = openSubmenuId === item.submenuId;
              const parentActive = isSubmenuParentActive(
                item.submenuId,
                pathname
              );
              return (
                <div key={item.submenuId} className="flex flex-col">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() =>
                      setOpenSubmenuId((prev) =>
                        prev === item.submenuId ? null : item.submenuId
                      )
                    }
                    className={`flex items-center justify-center lg:justify-start gap-4 py-2 md:px-2 rounded-md hover:bg-lamaSkyLight w-full text-left ${
                      parentActive
                        ? "bg-lamaSkyLight font-medium text-gray-700"
                        : "text-gray-500"
                    }`}
                  >
                    <Image src={item.icon} alt="" width={20} height={20} />
                    <span className="hidden lg:block flex-1">{item.label}</span>
                    <span
                      className="hidden lg:inline text-gray-400 text-xs"
                      aria-hidden
                    >
                      {expanded ? "▾" : "▸"}
                    </span>
                  </button>
                  {expanded && (
                    <div className="flex flex-col border-l border-gray-200 ml-4 lg:ml-6 pl-3 lg:pl-4 mb-1">
                      {item.children
                        .filter((child) => {
                          if (
                            "visible" in child &&
                            Array.isArray(child.visible)
                          ) {
                            return !!effectiveRole && child.visible.includes(effectiveRole);
                          }
                          return true;
                        })
                        .map((child) => {
                          const childActive = isSubmenuChildActive(
                            pathname,
                            child.href,
                            "exact" in child ? child.exact : undefined
                          );
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`flex items-center justify-center lg:justify-start py-2 md:px-2 rounded-md hover:bg-lamaSkyLight text-sm ${
                                childActive
                                  ? "bg-lamaSkyLight font-medium text-gray-700"
                                  : "text-gray-500"
                              }`}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            }

            if ("isProfile" in item && item.isProfile) {
              return (
                <a
                  key="profile"
                  href={item.href}
                  className="flex w-full min-h-[2.5rem] items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lamaSkyLight"
                >
                  <Image src={item.icon} alt="" width={20} height={20} />
                  <span className="hidden lg:block">{item.label}</span>
                </a>
              );
            }

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
          })}
        </div>
      ))}
    </div>
  );
};

export default Menu;