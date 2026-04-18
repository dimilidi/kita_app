"use client";

import FormModal from "@/components/FormModal";
import FilterDropdown from "@/components/filter/FilterDropdown";
import FilterPanel from "@/components/filter/FilterPanel";
import ResetFiltersButton from "@/components/filter/ResetFiltersButton";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import SearchInput from "@/components/search/SearchInput";
import SortDropdown from "@/components/sort/SortDropdown";
import SortPanel from "@/components/sort/SortPanel";
import { buildPlayAreaPdfDocument } from "@/lib/pdf/buildPlayAreaPdfDoc";
import type { PlayAreaPdfLabels } from "@/lib/pdf/buildPlayAreaPdfDoc";
import type { PlayAreaPdfSection } from "@/types/playAreas";
import { DEFAULT_LOCALE } from "@/i18n/lang";
import { useTranslations } from "@/i18n/TranslationsProvider";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import { toast } from "react-toastify";

import { fetchPlayAreasExportSections } from "./export-actions";

type AreaRow = {
  id: string;
  name: string;
  capacity: number | null;
  _count: { lessons: number };
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

const getLangFromPathname = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  const maybe = segments[0];
  if (maybe === "en" || maybe === "de") return maybe;
  return DEFAULT_LOCALE;
};

export default function AreaListClient({
  data,
  exportSections,
  count,
  page,
  role,
}: {
  data: AreaRow[];
  exportSections: PlayAreaPdfSection[];
  count: number;
  page: number;
  role: string;
}) {
  const dict = useTranslations();
  /** Shared PDF column labels / brand with Lunch Groups (`lunchGroups.detail`). */
  const lgd = dict.lunchGroups.detail ?? {};
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lang = getLangFromPathname(pathname);
  const boardHref = `/${lang}/list/areas/board`;

  const pdfLabels: PlayAreaPdfLabels = useMemo(() => {
    const d = dict.lunchGroups.detail ?? {};
    return {
      pdfBrandName: String(d.pdfBrandName ?? "KitaKarlstraße"),
      pdfSectionEducators: dict.areasList.pdfSectionEducators,
      pdfSectionActivities: dict.areasList.pdfSectionActivities,
      pdfSectionChildren: dict.areasList.pdfSectionChildren,
      pdfColNum: d.pdfColNum,
      pdfColChildName: d.pdfColChildName,
      pdfColGroup: d.pdfColGroup,
      pdfTotal: d.pdfTotal ?? "Total",
      emptyState: dict.common.noResults,
    };
  }, [dict]);

  const pdfLang = lang === "de" ? "de" : "en";

  const [actionsOpen, setActionsOpen] = useState(false);
  const [isPdfBusy, setIsPdfBusy] = useState(false);
  const [isPrintPreparing, setIsPrintPreparing] = useState(false);
  /** Fresh full export before print/PDF (ignores UI pagination); reset when filters change. */
  const [resolvedExportSections, setResolvedExportSections] = useState<
    PlayAreaPdfSection[] | null
  >(null);

  const actionsRef = useRef<HTMLDivElement>(null);

  useClickOutside(actionsRef, actionsOpen, () => setActionsOpen(false));

  const listQueryKey = useMemo(
    () => searchParams.toString(),
    [searchParams]
  );

  const filterParams = useMemo(() => {
    const sp: Record<string, string | undefined> = {};
    searchParams.forEach((value, key) => {
      sp[key] = value;
    });
    return sp;
  }, [listQueryKey]);

  useEffect(() => {
    setResolvedExportSections(null);
  }, [listQueryKey]);

  /** Print/PDF use full filtered list from server (same as `/list/areas` data + lessons/activities merge). */
  const sectionsForExport = resolvedExportSections ?? exportSections;

  const onPrint = async () => {
    setActionsOpen(false);
    setIsPrintPreparing(true);
    try {
      const sections = await fetchPlayAreasExportSections(filterParams);
      flushSync(() => setResolvedExportSections(sections));
      window.print();
    } catch (e) {
      console.error("Play areas print export fetch failed:", e);
      toast(
        `${dict.forms.somethingWentWrong}${
          e instanceof Error ? `: ${e.message}` : ""
        }`
      );
    } finally {
      setIsPrintPreparing(false);
    }
  };

  const onDownloadPdf = async () => {
    setIsPdfBusy(true);
    try {
      const sections = await fetchPlayAreasExportSections(filterParams);
      const { doc } = await buildPlayAreaPdfDocument({
        sections,
        lang: pdfLang,
        labels: pdfLabels,
      });
      const safe = dict.areasList.titleAll
        .replace(/[/\\?%*:|"<>]/g, "-")
        .replace(/\s+/g, "_")
        .slice(0, 40);
      (doc as { save: (name: string) => void }).save(`play_areas_${safe}.pdf`);
    } catch (e) {
      console.error("Play areas PDF export failed:", e);
      toast(
        `${dict.forms.somethingWentWrong}${
          e instanceof Error ? `: ${e.message}` : ""
        }`
      );
    } finally {
      setIsPdfBusy(false);
      setActionsOpen(false);
    }
  };

  const colBase =
    "p-3 align-top w-1/4 max-w-[25%] box-border";
  const columns = [
    {
      header: dict.areasList.columns.name,
      accessor: "name",
      className: `${colBase} min-w-0`,
    },
    {
      header: dict.areasList.columns.capacity,
      accessor: "capacity",
      className: `${colBase} text-center tabular-nums`,
    },
    {
      header: dict.areasList.columns.scheduledActivities,
      accessor: "lessons",
      className: `${colBase} text-center tabular-nums`,
    },
    {
      header: dict.common.actions,
      accessor: "action",
      className: colBase,
    },
  ];

  const renderRow = (item: AreaRow) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kitaPurpleLight"
    >
      <td className="p-3 font-medium min-w-0 w-1/4 max-w-[25%] box-border">
        {item.name}
      </td>
      <td className="p-3 w-1/4 max-w-[25%] box-border text-center tabular-nums">
        {item.capacity != null ? item.capacity : "—"}
      </td>
      <td className="p-3 w-1/4 max-w-[25%] box-border text-center tabular-nums">
        {item._count?.lessons ?? 0}
      </td>
      <td className="p-3 w-1/4 max-w-[25%] box-border">
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormModal table="zone" type="update" data={item} />
              <FormModal table="zone" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const dateLong = new Date().toLocaleDateString(
    lang === "de" ? "de-DE" : "en-GB",
    { dateStyle: "long" }
  );

  return (
    <>
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="print:hidden">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold">{dict.areasList.titleAll}</h1>
                <p className="text-xs text-gray-600 mt-2 max-w-3xl leading-relaxed">
                  {dict.areasList.intro}
                </p>
              </div>
              <div className="flex w-full xl:w-auto xl:shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Link
                  href={boardHref}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-kitaSky text-sm font-medium text-gray-800 hover:opacity-90 whitespace-nowrap shrink-0"
                >
                  <Image src="/area.png" alt="" width={18} height={18} />
                  {dict.areasList.openBoard}
                </Link>
                <SearchInput className="w-full sm:w-auto flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2 min-w-0 sm:max-w-[min(100%,280px)]" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <FilterPanel title={dict.common.filters}>
                <FilterDropdown
                  label={dict.areasList.filters.hasActivities}
                  paramKey="hasActivities"
                  options={[
                    {
                      label: dict.areasList.filters.onlyWithActivities,
                      value: "1",
                    },
                  ]}
                  allowClear
                />
                <FilterDropdown
                  label={dict.areasList.filters.capacityMinAtLeast}
                  paramKey="capacityMin"
                  options={[
                    { label: dict.areasList.filters.capacityAny, value: "" },
                    { label: "5+", value: "5" },
                    { label: "10+", value: "10" },
                    { label: "15+", value: "15" },
                    { label: "20+", value: "20" },
                  ]}
                  allowClear={false}
                />
              </FilterPanel>

              <SortPanel title={dict.common.sortBy}>
                <SortDropdown
                  options={[
                    { label: dict.areasList.columns.name, value: "name" },
                    { label: dict.areasList.columns.capacity, value: "capacity" },
                    {
                      label: dict.areasList.columns.scheduledActivities,
                      value: "lessons",
                    },
                  ]}
                  defaultSort="name"
                  defaultOrder="asc"
                />
              </SortPanel>

              <ResetFiltersButton label={dict.common.resetFilters} />

              <div className="relative flex items-center" ref={actionsRef}>
                <button
                  type="button"
                  className={`h-9 w-9 rounded-md border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 ${
                    isPdfBusy || isPrintPreparing
                      ? "opacity-60 cursor-not-allowed"
                      : ""
                  }`}
                  onClick={() => setActionsOpen((v) => !v)}
                  aria-label={dict.common.actions}
                  aria-expanded={actionsOpen}
                  disabled={isPdfBusy || isPrintPreparing}
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
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-60"
                      onClick={() => void onPrint()}
                      disabled={isPdfBusy || isPrintPreparing}
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
                      <span>{dict.areasList.exportPrint}</span>
                    </button>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      onClick={() => void onDownloadPdf()}
                      disabled={isPdfBusy || isPrintPreparing}
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
                      <span>{dict.areasList.exportDownloadPdf}</span>
                    </button>
                  </div>
                )}
              </div>

              {role === "admin" && <FormModal table="zone" type="create" />}
            </div>
          </div>

          {data.length === 0 ? (
            <div className="mt-6 text-sm text-gray-500">
              {dict.common.noResults}
            </div>
          ) : null}

          <div className="overflow-x-auto mt-4">
            <Table
              columns={columns}
              renderRow={renderRow}
              data={data}
              tableClassName="w-full min-w-[720px] table-fixed border-collapse"
            />
          </div>
          <Pagination page={page} count={count} />
        </div>
      </div>

      <div className="hidden print:block print:w-full print:max-w-none print:[overflow:visible]">
        {sectionsForExport.length === 0 ? (
          <div className="print:p-8">
            <div className="flex justify-between items-start gap-4 mb-4">
              <h1 className="text-xl font-bold text-gray-900">
                {dict.common.noResults}
              </h1>
              <p className="text-sm text-gray-600 shrink-0">{dateLong}</p>
            </div>
            <div className="mb-6 flex items-center gap-2">
              <img
                src="/logo.jpg"
                alt=""
                className="h-[18px] w-[18px] object-contain"
              />
              <span className="font-bold text-base text-gray-900">
                {lgd.pdfBrandName}
              </span>
            </div>
          </div>
        ) : (
          sectionsForExport.map((sec, sectionIdx) => (
            <div
              key={sec.areaName + sectionIdx}
              className="print:p-8 max-w-none"
              style={
                sectionIdx > 0 ? { breakBefore: "page" as const } : undefined
              }
            >
              <div className="flex justify-between items-start gap-4 mb-4">
                <h1 className="text-xl font-bold text-gray-900">
                  {sec.areaName}
                </h1>
                <p className="text-sm text-gray-600 shrink-0">{dateLong}</p>
              </div>
              <div className="mb-4 flex items-center gap-2">
                <img
                  src="/logo.jpg"
                  alt=""
                  className="h-[18px] w-[18px] object-contain"
                />
                <span className="font-bold text-base text-gray-900">
                  {lgd.pdfBrandName}
                </span>
              </div>

              <h2 className="text-sm font-semibold text-gray-900 mt-4 mb-1">
                {dict.areasList.pdfSectionEducators}
              </h2>
              <p className="text-sm text-gray-800 mb-4">
                {sec.educatorNames.length > 0
                  ? sec.educatorNames.join(", ")
                  : "—"}
              </p>

              <h2 className="text-sm font-semibold text-gray-900 mb-1">
                {dict.areasList.pdfSectionActivities}
              </h2>
              <p className="text-sm text-gray-800 mb-4">
                {sec.activityNames.length > 0
                  ? sec.activityNames.join(", ")
                  : "—"}
              </p>

              <h2 className="text-sm font-semibold text-gray-900 mb-2">
                {dict.areasList.pdfSectionChildren}
              </h2>
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
                        <td className="border border-gray-400 p-2">
                          {c.className}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <p className="mt-4 text-base font-semibold">
                {lgd.pdfTotal}: {sec.children.length} /{" "}
                {sec.capacity != null ? sec.capacity : "—"}
              </p>
            </div>
          ))
        )}
      </div>
    </>
  );
}
