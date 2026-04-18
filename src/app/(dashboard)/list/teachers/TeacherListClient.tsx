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
import Link from "next/link";

export default function TeacherListClient({
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
    { header: dict.teachers.columns.info, accessor: "info" },
    {
      header: dict.teachers.columns.teacherId,
      accessor: "teacherId",
      className: "hidden md:table-cell",
    },
    {
      header: dict.teachers.columns.activities,
      accessor: "activities",
      className: "hidden md:table-cell",
    },
    {
      header: dict.teachers.columns.areas,
      accessor: "areas",
      className: "hidden md:table-cell",
    },
    {
      header: dict.teachers.columns.phone,
      accessor: "phone",
      className: "hidden lg:table-cell",
    },
    {
      header: dict.teachers.columns.address,
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
        <Image
          src={item.img || "/noAvatar.png"}
          alt=""
          width={40}
          height={40}
          className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-xs text-gray-500">{item?.email}</p>
        </div>
      </td>
      <td className="hidden md:table-cell">{item.username}</td>
      <td className="hidden md:table-cell">
        <div className="flex flex-wrap gap-1">
          {(item.lessons || []).map((lesson: any) => (
            <span
              key={lesson.id}
              className="px-2 py-1 text-xs rounded-md bg-blue-100 text-blue-700"
            >
              {lesson.name}
            </span>
          ))}
        </div>
      </td>
      <td className="hidden md:table-cell">
        {(item.zones || [])
          .map((teacherZone: any) => teacherZone.zone?.name)
          .filter(Boolean)
          .join(", ")}
      </td>
      <td className="hidden md:table-cell">{item.phone}</td>
      <td className="hidden md:table-cell">{item.address}</td>
      <td>
        <div className="flex items-center gap-2">
          <Link href={`/list/teachers/${item.id}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-kitaSky">
              <Image src="/view.png" alt="" width={16} height={16} />
            </button>
          </Link>
          {role === "admin" && (
            <FormModal table="teacher" type="delete" id={item.id} />
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          {dict.teachers.titleAll}
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
              <FilterDropdown
                label={dict.entities.zone}
                paramKey="zoneId"
                options={(relatedData?.zones ?? []).map((z: any) => ({
                  label: String(z.name),
                  value: String(z.id),
                }))}
              />
              <FilterDropdown
                label={dict.forms.lesson}
                paramKey="lessonId"
                options={(relatedData?.lessons ?? []).map((lesson: any) => ({
                  label: String(lesson.name),
                  value: String(lesson.id),
                }))}
              />
            </FilterPanel>

            <SortPanel title={dict.common.sortBy}>
              <SortDropdown
                options={[
                  { label: dict.forms.firstName, value: "name" },
                  { label: dict.forms.lastName, value: "surname" },
                  { label: dict.forms.email, value: "email" },
                  { label: dict.common.created, value: "createdAt" },
                  { label: dict.teachers.sort.lessonCount, value: "lessonCount" },
                ]}
                defaultSort="surname"
                defaultOrder="asc"
              />
            </SortPanel>

            <ResetFiltersButton label={dict.common.resetFilters} />

            {role === "admin" && (
              <FormModal table="teacher" type="create" relatedData={relatedData} />
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

