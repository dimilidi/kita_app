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
import { markVisibleAnnouncementsAsRead } from "@/lib/actions";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AnnouncementListClient({
  data,
  count,
  page,
  role,
  relatedData,
}: {
  data: any[];
  count: number;
  page: number;
  role: string;
  relatedData?: any;
}) {
  const dict = useTranslations();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await markVisibleAnnouncementsAsRead();
      if (!cancelled) {
        router.refresh();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const columns = [
    { header: dict.common.title, accessor: "title" },
    { header: dict.announcementsList.columns.class, accessor: "class" },
    {
      header: dict.announcementsList.columns.date,
      accessor: "date",
      className: "hidden md:table-cell",
    },
    ...(role === "admin"
      ? [{ header: dict.common.actions, accessor: "action" }]
      : []),
  ];

  const renderRow = (item: any) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kitaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{item.title}</td>
      <td>{item.class?.name || "-"}</td>
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("en-GB").format(new Date(item.date))}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormModal table="announcement" type="update" data={item} relatedData={relatedData} />
              <FormModal table="announcement" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          {dict.announcementsList.titleAll}
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <SearchInput />

          <div className="flex flex-wrap items-center justify-end gap-3 self-end">
            <FilterPanel title={dict.common.filters}>
              <FilterDropdown
                label={dict.entities.class}
                paramKey="classId"
                options={(relatedData?.classes ?? []).map((c: any) => ({
                  label: String(c.name),
                  value: String(c.id),
                }))}
              />
            </FilterPanel>

            <SortPanel>
              <SortDropdown
                options={[
                  { label: dict.announcementsList.columns.date, value: "date" },
                  { label: dict.common.title, value: "title" },
                ]}
                defaultSort="date"
                defaultOrder="desc"
              />
            </SortPanel>

            <ResetFiltersButton label={dict.common.resetFilters} />

            {role === "admin" && (
              <FormModal table="announcement" type="create" relatedData={relatedData} />
            )}
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="mt-6 text-sm text-gray-500">{dict.common.noResults}</div>
      ) : null}

      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination page={page} count={count} />
    </div>
  );
}
