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
import { useTranslations } from "@/i18n/TranslationsProvider";

export default function EventListClient({
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

  const columns = [
    { header: dict.common.title, accessor: "title" },
    { header: dict.eventsList.columns.class, accessor: "class" },
    {
      header: dict.eventsList.columns.date,
      accessor: "date",
      className: "hidden md:table-cell",
    },
    {
      header: dict.eventsList.columns.startTime,
      accessor: "startTime",
      className: "hidden md:table-cell",
    },
    {
      header: dict.eventsList.columns.endTime,
      accessor: "endTime",
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
        {new Intl.DateTimeFormat("en-BG").format(new Date(item.startTime))}
      </td>
      <td className="hidden md:table-cell">
        {new Date(item.startTime).toLocaleTimeString("en-BG", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </td>
      <td className="hidden md:table-cell">
        {new Date(item.endTime).toLocaleTimeString("en-BG", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormModal table="event" type="update" data={item} relatedData={relatedData} />
              <FormModal table="event" type="delete" id={item.id} />
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
          {dict.eventsList.titleAll}
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
                  { label: dict.eventsList.columns.startTime, value: "startTime" },
                  { label: dict.common.title, value: "title" },
                  { label: dict.eventsList.columns.endTime, value: "endTime" },
                ]}
                defaultSort="startTime"
                defaultOrder="asc"
              />
            </SortPanel>

            <ResetFiltersButton label={dict.common.resetFilters} />

            {role === "admin" && (
              <FormModal table="event" type="create" relatedData={relatedData} />
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
