"use client";

import {
  createLunchGroup,
  deleteLunchGroup,
  updateLunchGroup,
} from "@/lib/actions";
import Image from "next/image";
import TableSearch from "@/components/TableSearch";
import { useMemo, useState } from "react";
import { useTranslations } from "@/i18n/TranslationsProvider";

const COLOR_OPTIONS = [
  { label: "Green", value: "bg-green-50 border-green-300" },
  { label: "Yellow", value: "bg-yellow-50 border-yellow-300" },
  { label: "Red", value: "bg-red-50 border-red-300" },
  { label: "Blue", value: "bg-blue-50 border-blue-300" },
  { label: "Purple", value: "bg-purple-50 border-purple-300" },
  { label: "Orange", value: "bg-orange-50 border-orange-300" },
  { label: "Gray", value: "bg-gray-50 border-gray-300" },
] as const;

type LunchGroupItem = {
  id: string;
  name: string;
  color: string | null;
  capacity: number | null;
  _count: { assignments: number };
};

export default function LunchGroupsManager({
  initialItems,
  canManage,
}: {
  initialItems: LunchGroupItem[];
  canManage: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<LunchGroupItem | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [capacity, setCapacity] = useState("15");
  const dict = useTranslations();

  const getColorLabel = (value: string | null) =>
    COLOR_OPTIONS.find((o) => o.value === value)?.label ?? (value || "-");

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  const openCreate = () => {
    setEditing(null);
    setName("");
    setColor("");
    setCapacity("15");
    setIsOpen(true);
  };

  const openEdit = (item: LunchGroupItem) => {
    setEditing(item);
    setName(item.name);
    setColor(item.color ?? "");
    setCapacity(String(item.capacity ?? 15));
    setIsOpen(true);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          {dict.lunchGroups.titleAll}
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
            {canManage && (
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full bg-kitaYellow"
                onClick={openCreate}
              >
                <Image src="/create.png" alt="" width={14} height={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <table className="w-full mt-4">
        <thead>
          <tr className="text-left text-gray-500 text-sm">
            <th>{dict.lunchGroups.name}</th>
            <th className="hidden md:table-cell">{dict.lunchGroups.color}</th>
            <th className="hidden md:table-cell">{dict.lunchGroups.capacity}</th>
            <th className="hidden md:table-cell">{dict.lunchGroups.children}</th>
            <th>{dict.common.actions}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => (
            <tr
              key={item.id}
              className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kitaPurpleLight"
            >
              <td className="p-4 font-medium">{item.name}</td>
              <td className="hidden md:table-cell">{getColorLabel(item.color)}</td>
              <td className="hidden md:table-cell">{item.capacity ?? 15}</td>
              <td className="hidden md:table-cell">{item._count.assignments}</td>
              <td>
                <div className="flex items-center gap-2">
                  {canManage && (
                    <>
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-kitaYellow"
                        onClick={() => openEdit(item)}
                      >
                        <Image src="/update.png" alt="" width={16} height={16} />
                      </button>
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-kitaPurple"
                        onClick={async () => {
                          const res = await deleteLunchGroup(item.id);
                          if (!res.success) return;
                          setItems((prev) => prev.filter((x) => x.id !== item.id));
                        }}
                      >
                        <Image src="/delete.png" alt="" width={16} height={16} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">
                {editing ? dict.lunchGroups.edit : dict.lunchGroups.add}
              </h3>
              <button
                className="rounded px-2 py-1 text-sm hover:bg-gray-100"
                onClick={() => setIsOpen(false)}
              >
                {dict.common.close}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {dict.lunchGroups.name}
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {dict.lunchGroups.color}
                </label>
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">{dict.lunchGroups.defaultColor}</option>
                  {COLOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  {color &&
                    !COLOR_OPTIONS.some((option) => option.value === color) && (
                      <option value={color}>{dict.lunchGroups.customExisting}</option>
                    )}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {dict.lunchGroups.capacity}
                </label>
                <input
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  type="number"
                  min={1}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white"
                onClick={async () => {
                  const parsedCapacity = Number(capacity || "15");
                  if (editing) {
                    const res = await updateLunchGroup(editing.id, {
                      name,
                      color,
                      capacity: Number.isFinite(parsedCapacity) ? parsedCapacity : 15,
                    });
                    if (!res.success) return;
                    window.location.reload();
                    return;
                  }
                  const res = await createLunchGroup({
                    name,
                    color,
                    capacity: Number.isFinite(parsedCapacity) ? parsedCapacity : 15,
                  });
                  if (!res.success) return;
                  window.location.reload();
                }}
              >
                {dict.common.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
