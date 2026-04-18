"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type OverflowMenuItem = {
  id: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
  /** Omit from menu entirely (e.g. no dataset available). */
  hidden?: boolean;
};

export default function DashboardChartOverflowMenu({
  items,
  ariaLabel,
}: {
  items: OverflowMenuItem[];
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const visible = items.filter((i) => !i.hidden);
  if (visible.length === 0 || visible.length === 1) {
    return (
      <Image
        src="/moreDark.png"
        alt=""
        width={20}
        height={20}
        className={visible.length === 1 ? "opacity-70" : undefined}
        aria-hidden
      />
    );
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        className="rounded-md p-0.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-kitaPurple/40"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-30 mt-1.5 min-w-[14rem] max-w-[calc(100vw-2rem)] rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitemradio"
              aria-checked={item.selected}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                item.selected
                  ? "bg-kitaPurpleLight/50 font-medium text-gray-900"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
            >
              <span className="min-w-0 flex-1">{item.label}</span>
              {item.selected ? (
                <span className="text-kitaPurple shrink-0" aria-hidden>
                  ✓
                </span>
              ) : (
                <span className="w-4 shrink-0" aria-hidden />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
