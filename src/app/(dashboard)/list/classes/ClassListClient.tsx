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

type ClassList = {
  id: number | string;
  name: string;
  capacity: number;
  gradeId?: number | null;
  supervisorId?: string | null;
  grade?: { id: number; level: number } | null;
  supervisor: { name: string; surname: string } | null;
};

export default function ClassListClient({
  data,
  count,
  page,
  role,
  relatedData,
}: {
  data: ClassList[];
  count: number;
  page: number;
  role: string | null | undefined;
  relatedData?: any;
}) {
  const dict = useTranslations();

  const columns = [
    { header: dict.classes.columns.className, accessor: "name" },
    {
      header: dict.classes.columns.capacity,
      accessor: "capacity",
      className: "hidden md:table-cell",
    },
    {
      header: dict.classes.columns.grade,
      accessor: "grade",
      className: "hidden md:table-cell",
    },
    {
      header: dict.classes.columns.supervisor,
      accessor: "supervisor",
      className: "hidden md:table-cell",
    },
    ...(role === "admin"
      ? [{ header: dict.common.actions, accessor: "action" }]
      : []),
  ];

  const renderRow = (item: ClassList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kitaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{item.name}</td>
      <td className="hidden md:table-cell">{item.capacity}</td>
      <td className="hidden md:table-cell">
        {item.grade?.level === 1
          ? `${dict.students.groups?.nursery ?? "Krippe"} (0-3)`
          : item.grade?.level === 2
          ? `${dict.students.groups?.kindergarten ?? "Kindergarten"} (3-6)`
          : "-"}
      </td>
      <td className="hidden md:table-cell">
        {item.supervisor
          ? item.supervisor.name + " " + item.supervisor.surname
          : "-"}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormModal
                table="class"
                type="update"
                data={item}
                relatedData={relatedData}
              />
              <FormModal table="class" type="delete" id={item.id} />
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
          {dict.classes.titleAll}
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <SearchInput />

          <div className="flex flex-wrap items-center justify-end gap-3 self-end">
            <FilterPanel title={dict.common.filters}>
              <FilterDropdown
                label={dict.classes.columns.grade}
                paramKey="gradeId"
                options={(relatedData?.grades ?? []).map((g: any) => ({
                  label:
                    g.level === 1
                      ? `${dict.students.groups.nursery} (0–3)`
                      : g.level === 2
                        ? `${dict.students.groups.kindergarten} (3–6)`
                        : String(g.level),
                  value: String(g.id),
                }))}
              />
              <FilterDropdown
                label={dict.classes.columns.supervisor}
                paramKey="supervisorId"
                options={(relatedData?.teachers ?? []).map((t: any) => ({
                  label: `${t.name} ${t.surname}`,
                  value: String(t.id),
                }))}
              />
            </FilterPanel>

            <SortPanel title={dict.common.sortBy}>
              <SortDropdown
                options={[
                  { label: dict.classes.columns.className, value: "name" },
                  { label: dict.classes.columns.capacity, value: "capacity" },
                  { label: dict.classes.columns.grade, value: "gradeId" },
                ]}
                defaultSort="name"
                defaultOrder="asc"
              />
            </SortPanel>

            <ResetFiltersButton label={dict.common.resetFilters} />
            {role === "admin" && (
              <FormModal table="class" type="create" relatedData={relatedData} />
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

