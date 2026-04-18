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
import Image from "next/image";

export default function ParentListClient({
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

  const columns = [
    { header: dict.parents.columns.info, accessor: "info" },
    {
      header: dict.parents.columns.studentNames,
      accessor: "students",
      className: "hidden md:table-cell",
    },
    {
      header: dict.parents.columns.phone,
      accessor: "phone",
      className: "hidden lg:table-cell",
    },
    {
      header: dict.parents.columns.address,
      accessor: "address",
      className: "hidden lg:table-cell",
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
      <td className="flex items-center gap-4 p-4">
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-xs text-gray-500">{item?.email}</p>
        </div>
      </td>
      <td className="hidden md:table-cell">
        {(item.students || []).map((s: any) => s.name).join(",")}
      </td>
      <td className="hidden md:table-cell">{item.phone}</td>
      <td className="hidden md:table-cell">{item.address}</td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormModal table="parent" type="update" data={item} />
              <FormModal table="parent" type="delete" id={item.id} />
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
          {dict.parents.titleAll}
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <SearchInput />

          <div className="flex flex-wrap items-center justify-end gap-3 self-end">
            <FilterPanel title={dict.common.filters}>
              <FilterDropdown
                label={dict.parents.filters.children}
                paramKey="childrenFilter"
                options={[
                  { label: dict.parents.filters.hasChildren, value: "has" },
                  { label: dict.parents.filters.noChildren, value: "none" },
                ]}
              />
            </FilterPanel>
            <SortPanel title={dict.common.sortBy}>
              <SortDropdown
                options={[
                  { label: dict.forms.firstName, value: "name" },
                  { label: dict.forms.lastName, value: "surname" },
                  { label: dict.forms.email, value: "email" },
                  { label: dict.common.created, value: "createdAt" },
                  { label: dict.entitiesPlural.student, value: "students" },
                ]}
                defaultSort="surname"
                defaultOrder="asc"
              />
            </SortPanel>
            <ResetFiltersButton label={dict.common.resetFilters} />
            {role === "admin" && <FormModal table="parent" type="create" />}
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

