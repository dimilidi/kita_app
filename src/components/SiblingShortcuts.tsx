"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/TranslationsProvider";

export type SiblingShortcut = {
  id: string;
  name: string;
  surname: string;
};

const baseClass =
  "p-3 rounded-md bg-kitaYellowLight text-xs text-gray-800 shadow-sm ring-1 ring-amber-200/60 hover:bg-amber-50/90 transition-colors";

/** Shortcuts row item: one yellow link, or a yellow dropdown when there are multiple siblings. */
export default function SiblingShortcuts({
  siblings,
}: {
  siblings: SiblingShortcut[];
}) {
  const dict = useTranslations();
  const router = useRouter();
  const short = dict.dashboard?.shortcutSibling ?? "Sibling";
  const placeholder = dict.dashboard?.selectSibling ?? "Select sibling";

  if (siblings.length === 0) return null;

  if (siblings.length === 1) {
    const s = siblings[0];
    return (
      <Link className={baseClass} href={`/list/students/${s.id}`}>
        {short}: {s.name} {s.surname}
      </Link>
    );
  }

  return (
    <select
      className={`${baseClass} cursor-pointer min-w-[10rem] max-w-[min(100%,14rem)]`}
      aria-label={placeholder}
      defaultValue=""
      onChange={(e) => {
        const id = e.target.value;
        if (id) router.push(`/list/students/${id}`);
        e.target.selectedIndex = 0;
      }}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {siblings.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name} {s.surname}
        </option>
      ))}
    </select>
  );
}
