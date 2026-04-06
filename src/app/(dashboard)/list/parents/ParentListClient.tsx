"use client";

import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
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
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kitaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kitaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {role === "admin" && <FormModal table="parent" type="create" />}
          </div>
        </div>
      </div>

      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination page={page} count={count} />
    </div>
  );
}

