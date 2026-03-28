"use client";

import {
  createLunchGroup,
  deleteLunchGroup,
  updateLunchGroup,
} from "@/lib/actions";
import Image from "next/image";
import Link from "next/link";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import type { LunchGroupPdfSection } from "@/types/lunchGroups";
import { DEFAULT_LOCALE } from "@/i18n/lang";
import { useEffect, useRef, useState, type RefObject } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { toast } from "react-toastify";

const COLOR_OPTIONS = [
  { label: "Green", value: "bg-green-50 border-green-300" },
  { label: "Yellow", value: "bg-yellow-50 border-yellow-300" },
  { label: "Red", value: "bg-red-50 border-red-300" },
  { label: "Blue", value: "bg-blue-50 border-blue-300" },
  { label: "Purple", value: "bg-purple-50 border-purple-300" },
  { label: "Orange", value: "bg-orange-50 border-orange-300" },
  { label: "Gray", value: "bg-gray-50 border-gray-300" },
] as const;

type LunchGroupItem = {
  id: string;
  name: string;
  color: string | null;
  capacity: number | null;
};

function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) onClose();
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open, onClose, ref]);
}

export default function LunchGroupsManager({
  initialItems,
  count,
  page,
  canManage,
  search: searchFromServer,
  sort: sortFromServer,
  filter: filterFromServer,
  exportSections,
}: {
  initialItems: LunchGroupItem[];
  count: number;
  page: number;
  canManage: boolean;
  search: string;
  sort: string;
  filter: string;
  exportSections: LunchGroupPdfSection[];
}) {
  const [items, setItems] = useState(initialItems);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<LunchGroupItem | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [capacity, setCapacity] = useState("15");
  const dict = useTranslations();
  /** Sort/filter/PDF strings live under `lunchGroups.detail` in locale JSON. */
  const lgd = dict.lunchGroups.detail ?? {};
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const localeSegments = pathname.split("/").filter(Boolean);
  const lang =
    localeSegments[0] === "en" || localeSegments[0] === "de"
      ? localeSegments[0]
      : DEFAULT_LOCALE;
  const boardHref = `/${lang}/list/lunch`;

  const sortKey = sortFromServer || "name_asc";
  const filterKey = filterFromServer || "all";

  useClickOutside(filterRef, filterOpen, () => setFilterOpen(false));
  useClickOutside(sortRef, sortOpen, () => setSortOpen(false));
  useClickOutside(actionsRef, actionsOpen, () => setActionsOpen(false));

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const pushParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    });
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const setSort = (next: string) => {
    pushParams({ sort: next });
    setSortOpen(false);
  };

  const setFilter = (next: string) => {
    pushParams({ filter: next === "all" ? undefined : next });
    setFilterOpen(false);
  };

  const sortLabel =
    sortKey === "name_desc"
      ? lgd.sortNameDesc
      : sortKey === "capacity_asc"
        ? lgd.sortCapacityAsc
        : sortKey === "capacity_desc"
          ? lgd.sortCapacityDesc
          : lgd.sortNameAsc;

  const filterLabel =
    filterKey === "with_children"
      ? lgd.filterWithChildren
      : filterKey === "with_space"
        ? lgd.filterWithSpace
        : lgd.filterAll;

  const onDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const [jspdfMod] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const jsPDFConstructor =
        (jspdfMod as any).jsPDF ?? (jspdfMod as any).default;
      if (typeof jsPDFConstructor !== "function") {
        throw new Error("Could not load jsPDF constructor.");
      }

      const doc = new jsPDFConstructor({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const left = 40;
      const right = 40;
      const pageWidth = doc.internal.pageSize.getWidth();
      const rightX = pageWidth - right;

      const dateStr = new Date().toLocaleDateString(
        lang === "de" ? "de-DE" : "en-GB",
        { dateStyle: "long" }
      );

      const autoTableMod = await import("jspdf-autotable");
      const autoTableFn = (autoTableMod as any).default ?? autoTableMod;
      if (typeof autoTableFn !== "function") {
        throw new Error("autoTable is not available.");
      }

      const head = [
        [lgd.pdfColNum, lgd.pdfColChildName, lgd.pdfColGroup],
      ];

      let logoDataUrl: string | null = null;
      try {
        const resp = await fetch("/logo.jpg");
        if (resp.ok) {
          const blob = await resp.blob();
          logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () =>
              reject(new Error("Could not read logo image"));
            reader.readAsDataURL(blob);
          });
        }
      } catch {
        // continue without logo
      }

      let isFirstSection = true;
      for (const sec of exportSections) {
        if (!isFirstSection) {
          doc.addPage();
        }
        isFirstSection = false;

        let y = 48;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text(sec.groupName, left, y);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(dateStr, rightX, y, { align: "right" });

        y += 28;

        const logoW = 18;
        const logoH = 18;
        const brandY = y - 12;
        if (logoDataUrl) {
          doc.addImage(logoDataUrl, "JPEG", left, brandY, logoW, logoH);
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(31, 41, 55);
        doc.text(
          String(lgd.pdfBrandName ?? "KitaKarlstraße"),
          logoDataUrl ? left + logoW + 8 : left,
          y
        );
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        y += 22;
        const eduLine = sec.educatorNames.length
          ? `${lgd.pdfEducators ?? "Educators"}: ${sec.educatorNames.join(", ")}`
          : `${lgd.pdfEducators ?? "Educators"}: —`;
        const eduLines =
          doc.splitTextToSize(eduLine, pageWidth - left - right) ?? [eduLine];
        doc.text(eduLines, left, y);
        y += Math.max(14, eduLines.length * 12);

        y += 6;
        const tsLine = `${lgd.pdfTischspruch ?? "Tischspruch"}: ${
          sec.tischspruchTitle ?? "—"
        }`;
        const tsLines =
          doc.splitTextToSize(tsLine, pageWidth - left - right) ?? [tsLine];
        doc.text(tsLines, left, y);
        y += Math.max(14, tsLines.length * 12);

        const body =
          sec.children.length > 0
            ? sec.children.map((c, idx) => [
                String(idx + 1),
                c.name,
                c.className,
              ])
            : [["—", "—", "—"]];

        autoTableFn(doc, {
          head,
          body,
          startY: y,
          theme: "grid",
          styles: {
            fontSize: 10,
            cellPadding: 5,
            lineWidth: 0.25,
          },
          headStyles: {
            fillColor: [248, 250, 252],
            textColor: [55, 65, 81],
          },
          columnStyles: {
            0: { cellWidth: 44, halign: "center" },
            1: { cellWidth: 220 },
          },
          margin: { left, right, bottom: 56 },
        });

        const finalY =
          (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable
            ?.finalY ?? y + 24;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        const cap = sec.capacity ?? 15;
        doc.text(
          `${lgd.pdfTotal ?? "Total"}: ${sec.children.length} / ${cap}`,
          left,
          finalY + 20
        );
      }

      const totalPages = doc.getNumberOfPages();
      for (let pi = 1; pi <= totalPages; pi++) {
        doc.setPage(pi);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text(
          `Page ${pi} / ${totalPages}`,
          left,
          doc.internal.pageSize.getHeight() - 24
        );
      }

      const safe = dict.lunchGroups.titleAll
        .replace(/[\/\\?%*:|"<>]/g, "-")
        .replace(/\s+/g, "_")
        .slice(0, 40);
      doc.save(`lunch_groups_${safe}.pdf`);
    } catch (e) {
      console.error("Lunch groups PDF export failed:", e);
      toast(
        `${dict.forms.somethingWentWrong}${
          e instanceof Error ? `: ${e.message}` : ""
        }`
      );
    } finally {
      setIsDownloadingPdf(false);
      setActionsOpen(false);
    }
  };

  const onPrint = () => {
    setActionsOpen(false);
    window.print();
  };

  const colBase =
    "p-3 align-top w-1/3 max-w-[33.333%] box-border";
  const columns = [
    {
      header: dict.lunchGroups.name,
      accessor: "name",
      className: `${colBase} min-w-0`,
    },
    {
      header: dict.lunchGroups.capacity,
      accessor: "capacity",
      className: `${colBase} text-center tabular-nums`,
    },
    {
      header: dict.common.actions,
      accessor: "action",
      className: colBase,
    },
  ];

  const openCreate = () => {
    setEditing(null);
    setName("");
    setColor("");
    setCapacity("15");
    setIsOpen(true);
  };

  const openEdit = (item: LunchGroupItem) => {
    setEditing(item);
    setName(item.name);
    setColor(item.color ?? "");
    setCapacity(String(item.capacity ?? 15));
    setIsOpen(true);
  };

  const renderRow = (item: LunchGroupItem) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kitaPurpleLight"
    >
      <td className="p-3 font-medium min-w-0 w-1/3 max-w-[33.333%] box-border">
        <Link
          href={`/${lang}/list/lunch-groups/${item.id}`}
          className="font-medium text-gray-900 no-underline opacity-100 transition-opacity hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 rounded-sm"
          title={dict.lunchGroups.detail.viewDetail}
        >
          {item.name}
        </Link>
      </td>
      <td className="p-3 w-1/3 max-w-[33.333%] box-border text-center tabular-nums">
        {item.capacity ?? 15}
      </td>
      <td className="p-3 w-1/3 max-w-[33.333%] box-border">
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-kitaYellow"
                onClick={() => openEdit(item)}
              >
                <Image src="/update.png" alt="" width={16} height={16} />
              </button>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-kitaPurple"
                onClick={async () => {
                  const res = await deleteLunchGroup(item.id);
                  if (!res.success) return;
                  setItems((prev) => prev.filter((x) => x.id !== item.id));
                }}
              >
                <Image src="/delete.png" alt="" width={16} height={16} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <>
      <div className="print:hidden">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-semibold">{dict.lunchGroups.titleAll}</h1>
            <p className="text-xs text-gray-600 mt-2 max-w-3xl leading-relaxed">
              {dict.lunchGroups.intro}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <Link
              href={boardHref}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-kitaSky text-sm font-medium text-gray-800 hover:opacity-90 whitespace-nowrap shrink-0"
            >
              <Image src="/lunch.png" alt="" width={18} height={18} />
              {dict.lunchGroups.openBoard}
            </Link>
            <div className="flex flex-col md:flex-row items-center gap-4 flex-1 md:flex-initial">
              <TableSearch defaultValue={searchFromServer} />
              <div className="flex items-center gap-2 sm:gap-4 self-end flex-wrap justify-end">
                <div className="relative" ref={filterRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterOpen((v) => !v);
                      setSortOpen(false);
                    }}
                    className="h-9 px-3 rounded-full bg-kitaYellow text-xs font-medium flex items-center gap-2"
                  >
                    <Image src="/filter.png" alt="" width={14} height={14} />
                    <span className="max-w-[10rem] truncate">{filterLabel}</span>
                  </button>
                  {filterOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg py-1 text-sm">
                        {(
                        [
                          ["all", lgd.filterAll],
                          [
                            "with_children",
                            lgd.filterWithChildren,
                          ],
                          ["with_space", lgd.filterWithSpace],
                        ] as const
                      ).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${
                            (key === "all" ? filterKey === "all" : filterKey === key)
                              ? "bg-kitaSky/30 font-medium"
                              : ""
                          }`}
                          onClick={() => setFilter(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative" ref={sortRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setSortOpen((v) => !v);
                      setFilterOpen(false);
                    }}
                    className="h-9 px-3 rounded-full bg-kitaYellow text-xs font-medium flex items-center gap-2"
                  >
                    <Image src="/sort.png" alt="" width={14} height={14} />
                    <span className="max-w-[10rem] truncate">{sortLabel}</span>
                  </button>
                  {sortOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg py-1 text-sm">
                      {(
                        [
                          ["name_asc", lgd.sortNameAsc],
                          ["name_desc", lgd.sortNameDesc],
                          ["capacity_asc", lgd.sortCapacityAsc],
                          ["capacity_desc", lgd.sortCapacityDesc],
                        ] as const
                      ).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${
                            sortKey === key ? "bg-kitaSky/30 font-medium" : ""
                          }`}
                          onClick={() => setSort(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative" ref={actionsRef}>
                  <button
                    type="button"
                    className={`h-9 w-9 rounded-md border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 ${
                      isDownloadingPdf ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                    onClick={() => setActionsOpen((v) => !v)}
                    aria-label={dict.common.actions}
                    disabled={isDownloadingPdf}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="w-5 h-5 text-gray-700"
                      aria-hidden
                    >
                      <circle cx="12" cy="5.5" r="1.6" fill="currentColor" />
                      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                      <circle cx="12" cy="18.5" r="1.6" fill="currentColor" />
                    </svg>
                  </button>
                  {actionsOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        onClick={onPrint}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="w-4 h-4 shrink-0"
                        >
                          <path d="M6 9V3h12v6" />
                          <rect x="6" y="14" width="12" height="7" rx="1" />
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        </svg>
                        <span>{lgd.printList}</span>
                      </button>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        onClick={() => void onDownloadPdf()}
                        disabled={isDownloadingPdf}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="w-4 h-4 shrink-0"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <path d="M7 10l5 5 5-5" />
                          <path d="M12 15V3" />
                        </svg>
                        <span>{lgd.downloadListPdf}</span>
                      </button>
                    </div>
                  )}
                </div>

                {canManage && (
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-kitaYellow"
                    onClick={openCreate}
                  >
                    <Image src="/create.png" alt="" width={14} height={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <Table
            columns={columns}
            renderRow={renderRow}
            data={items}
            tableClassName="w-full min-w-[720px] table-fixed border-collapse"
          />
        </div>
        <Pagination page={page} count={count} />
      </div>

      {/* Print-only: one section per page (same structure as PDF) */}
      <div className="hidden print:block">
        {exportSections.map((sec, sectionIdx) => (
          <div
            key={sec.groupName + sectionIdx}
            className="print:p-8 print:min-h-[90vh]"
            style={
              sectionIdx > 0
                ? { pageBreakBefore: "always" as const }
                : undefined
            }
          >
            <div className="flex justify-between items-start gap-4 mb-4">
              <h1 className="text-xl font-bold text-gray-900">{sec.groupName}</h1>
              <p className="text-sm text-gray-600 shrink-0">
                {new Date().toLocaleDateString(
                  lang === "de" ? "de-DE" : "en-GB",
                  { dateStyle: "long" }
                )}
              </p>
            </div>
            <div className="mb-3 flex items-center gap-2">
              <img
                src="/logo.jpg"
                alt=""
                className="h-[18px] w-[18px] object-contain"
              />
              <span className="font-bold text-base text-gray-900">
                {lgd.pdfBrandName}
              </span>
            </div>
            <p className="text-sm text-gray-800 mb-2">
              {sec.educatorNames.length > 0
                ? `${lgd.pdfEducators}: ${sec.educatorNames.join(", ")}`
                : `${lgd.pdfEducators}: —`}
            </p>
            <p className="text-sm text-gray-800 mb-3">
              {`${lgd.pdfTischspruch}: ${sec.tischspruchTitle ?? "—"}`}
            </p>
            <table className="w-full text-sm border-collapse border border-gray-400">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 p-2 w-12 text-center font-semibold">
                    {lgd.pdfColNum}
                  </th>
                  <th className="border border-gray-400 p-2 text-left font-semibold">
                    {lgd.pdfColChildName}
                  </th>
                  <th className="border border-gray-400 p-2 text-left font-semibold">
                    {lgd.pdfColGroup}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sec.children.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="border border-gray-400 p-2 text-gray-500 text-center"
                    >
                      —
                    </td>
                  </tr>
                ) : (
                  sec.children.map((c, i) => (
                    <tr key={`${c.name}-${i}`} className="even:bg-gray-50">
                      <td className="border border-gray-400 p-2 text-center tabular-nums">
                        {i + 1}
                      </td>
                      <td className="border border-gray-400 p-2">{c.name}</td>
                      <td className="border border-gray-400 p-2">{c.className}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <p className="mt-4 text-base font-semibold">
              {lgd.pdfTotal}: {sec.children.length} /{" "}
              {sec.capacity ?? 15}
            </p>
          </div>
        ))}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
          <div className="w-full max-w-xl rounded-xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">
                {editing ? dict.lunchGroups.edit : dict.lunchGroups.add}
              </h3>
              <button
                type="button"
                className="rounded px-2 py-1 text-sm hover:bg-gray-100"
                onClick={() => setIsOpen(false)}
              >
                {dict.common.close}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {dict.lunchGroups.name}
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {dict.lunchGroups.color}
                </label>
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">{dict.lunchGroups.defaultColor}</option>
                  {COLOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  {color &&
                    !COLOR_OPTIONS.some((option) => option.value === color) && (
                      <option value={color}>{dict.lunchGroups.customExisting}</option>
                    )}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {dict.lunchGroups.capacity}
                </label>
                <input
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  type="number"
                  min={1}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white"
                onClick={async () => {
                  const parsedCapacity = Number(capacity || "15");
                  if (editing) {
                    const res = await updateLunchGroup(editing.id, {
                      name,
                      color,
                      capacity: Number.isFinite(parsedCapacity) ? parsedCapacity : 15,
                    });
                    if (!res.success) return;
                    window.location.reload();
                    return;
                  }
                  const res = await createLunchGroup({
                    name,
                    color,
                    capacity: Number.isFinite(parsedCapacity) ? parsedCapacity : 15,
                  });
                  if (!res.success) return;
                  window.location.reload();
                }}
              >
                {dict.common.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
