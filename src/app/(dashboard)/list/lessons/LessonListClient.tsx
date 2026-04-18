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

export default function LessonListClient({
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
    { header: dict.forms.activity, accessor: "name" },
    { header: dict.forms.playArea, accessor: "playAreaName" },
    ...(role === "admin"
      ? [{ header: dict.common.actions, accessor: "action" }]
      : []),
  ];

  const renderRow = (item: any) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kitaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{item.name}</td>
      <td>{item.playAreaName}</td>
      {role === "admin" ? (
        <td>
          <div className="flex items-center gap-2">
            <FormModal table="lesson" type="update" data={item} relatedData={relatedData} />
            <FormModal table="lesson" type="delete" id={item.id} />
          </div>
        </td>
      ) : null}
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          {dict.lessons.titleAll}
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <SearchInput />

          <div className="flex flex-wrap items-center justify-end gap-3 self-end">
            <FilterPanel title={dict.common.filters}>
              <FilterDropdown
                label={dict.forms.playArea}
                paramKey="zoneId"
                options={(relatedData?.zones ?? []).map((z: any) => ({
                  label: String(z.name),
                  value: String(z.id),
                }))}
              />
              <FilterDropdown
                label={dict.lessons.columns.class}
                paramKey="classId"
                options={(relatedData?.classes ?? []).map((c: any) => ({
                  label: String(c.name),
                  value: String(c.id),
                }))}
              />
              <FilterDropdown
                label={dict.forms.educator}
                paramKey="lessonTeacherId"
                options={(relatedData?.teachers ?? []).map((t: any) => ({
                  label: `${t.name} ${t.surname}`.trim(),
                  value: String(t.id),
                }))}
              />
            </FilterPanel>

            <SortPanel title={dict.common.sortBy}>
              <SortDropdown
                options={[
                  { label: dict.forms.activity, value: "name" },
                  { label: dict.forms.playArea, value: "zone" },
                  { label: dict.lessons.columns.class, value: "class" },
                  { label: dict.forms.educator, value: "teacher" },
                  { label: dict.forms.day, value: "day" },
                ]}
                defaultSort="name"
                defaultOrder="asc"
              />
            </SortPanel>

            <ResetFiltersButton label={dict.common.resetFilters} />

            {role === "admin" ? (
              <FormModal table="lesson" type="create" relatedData={relatedData} />
            ) : null}
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
