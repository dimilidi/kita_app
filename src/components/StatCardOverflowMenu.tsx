"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function StatCardOverflowMenu({
  viewAllHref,
  viewAllLabel,
  overflowAriaLabel,
}: {
  viewAllHref: string;
  viewAllLabel: string;
  overflowAriaLabel: string;
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

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        className="rounded-md p-0.5 text-gray-700 hover:bg-white/40 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={overflowAriaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <Image src="/more.png" alt="" width={20} height={20} />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-40 mt-1.5 min-w-[12rem] max-w-[calc(100vw-2rem)] rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          <Link
            href={viewAllHref}
            role="menuitem"
            className="block px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            {viewAllLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
