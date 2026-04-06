"use client";

import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { useTranslations } from "@/i18n/TranslationsProvider";
import Image from "next/image";
import Link from "next/link";

export default function StudentListClient({
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
    { header: dict.students.columns.info, accessor: "info" },
    {
      header: dict.students.columns.grade,
      accessor: "grade",
    },
    { header: dict.students.parent, accessor: "parent", className: "hidden lg:table-cell" },
    { header: dict.students.columns.phone, accessor: "phone", className: "hidden lg:table-cell" },
    { header: dict.students.columns.address, accessor: "address", className: "hidden lg:table-cell" },
    { header: dict.common.actions, accessor: "action" },
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
          <p className="text-xs text-gray-500">{item.email || "—"}</p>
        </div>
      </td>
      <td className="p-4">{item.class?.name ?? "—"}</td>
      <td className="hidden lg:table-cell">
        {item.parent?.name} {item.parent?.surname}
      </td>
      <td className="hidden lg:table-cell">{item.parent?.phone ?? "—"}</td>
      <td className="hidden lg:table-cell">{item.parent?.address ?? "—"}</td>
      <td>
        <div className="flex items-center gap-2">
          <Link href={`/list/students/${item.id}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-kitaSky">
              <Image src="/view.png" alt="" width={16} height={16} />
            </button>
          </Link>
          {role === "admin" && (
            <FormModal table="student" type="delete" id={item.id} />
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          {dict.students.titleAll}
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
            {role === "admin" && (
              <FormModal
                table="student"
                type="create"
                relatedData={relatedData}
              />
            )}
          </div>
        </div>
      </div>

      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination page={page} count={count} />
    </div>
  );
}

