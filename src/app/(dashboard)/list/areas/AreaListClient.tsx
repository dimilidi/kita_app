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
import { DEFAULT_LOCALE } from "@/i18n/lang";
import { useTranslations } from "@/i18n/TranslationsProvider";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const getLangFromPathname = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  const maybe = segments[0];
  if (maybe === "en" || maybe === "de") return maybe;
  return DEFAULT_LOCALE;
};

export default function AreaListClient({
  data,
  count,
  page,
  role,
}: {
  data: any[];
  count: number;
  page: number;
  role: string;
}) {
  const dict = useTranslations();
  const pathname = usePathname();
  const lang = getLangFromPathname(pathname);
  const boardHref = `/${lang}/list/areas/board`;

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

  const renderRow = (item: any) => (
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

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">{dict.areasList.titleAll}</h1>
          <p className="text-xs text-gray-600 mt-2 max-w-3xl leading-relaxed">
            {dict.areasList.intro}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <Link
            href={boardHref}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-kitaSky text-sm font-medium text-gray-800 hover:opacity-90 whitespace-nowrap shrink-0"
          >
            <Image src="/area.png" alt="" width={18} height={18} />
            {dict.areasList.openBoard}
          </Link>
          <div className="flex flex-col md:flex-row items-center gap-3 flex-1 md:flex-initial">
            <SearchInput />

            <div className="flex flex-wrap items-center justify-end gap-3 self-end">
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

              {role === "admin" && <FormModal table="zone" type="create" />}
            </div>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="mt-6 text-sm text-gray-500">{dict.common.noResults}</div>
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
  );
}
