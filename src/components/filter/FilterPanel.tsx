"use client";

import FilterIcon from "@/components/ui/FilterIcon";
import { LIST_ICON_BUTTON_CLASS } from "@/components/list/listToolbarStyles";
import { FilterPanelCloseContext } from "@/components/list/panelCloseContexts";
import { useEffect, useRef, useState } from "react";

type FilterPanelProps = {
  title?: string;
  /** Screen readers / testing */
  ariaLabel?: string;
  children: React.ReactNode;
};

export default function FilterPanel({
  title,
  ariaLabel = "Filters",
  children,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        className={LIST_ICON_BUTTON_CLASS}
        onClick={() => setOpen((v) => !v)}
      >
        <FilterIcon />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            tabIndex={-1}
            onClick={close}
          />

          <FilterPanelCloseContext.Provider value={close}>
            <div
              className="fixed inset-x-0 bottom-0 z-50 max-h-[min(70vh,520px)] overflow-y-auto rounded-t-2xl border border-gray-200 bg-white p-4 shadow-xl md:absolute md:inset-auto md:bottom-auto md:left-auto md:right-0 md:top-full md:mt-2 md:max-h-[min(80vh,480px)] md:w-[min(calc(100vw-2rem),22rem)] md:rounded-lg"
              role="dialog"
              aria-modal="true"
            >
              {title ? (
                <div className="mb-3 text-sm font-semibold text-gray-800">{title}</div>
              ) : null}
              <div className="flex flex-col gap-3">{children}</div>
            </div>
          </FilterPanelCloseContext.Provider>
        </>
      ) : null}
    </div>
  );
}
