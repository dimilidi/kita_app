"use client";

import {
  createTischspruch,
  deleteTischspruch,
  updateTischspruch,
} from "@/lib/actions";
import Image from "next/image";
import { useMemo, useState } from "react";
import TableSearch from "@/components/TableSearch";
import { useTranslations } from "@/i18n/TranslationsProvider";

type Tischspruch = {
  id: number;
  title: string;
  text: string;
};

type Props = {
  initialItems: Tischspruch[];
  canManage: boolean;
};

export default function TischspruecheManager({ initialItems, canManage }: Props) {
  const [items, setItems] = useState<Tischspruch[]>(initialItems);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "view" | "edit">("view");
  const [selected, setSelected] = useState<Tischspruch | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  const dict = useTranslations();

  const openCreate = () => {
    setMode("create");
    setSelected(null);
    setTitle("");
    setText("");
    setIsOpen(true);
  };

  const openView = (item: Tischspruch) => {
    setMode("view");
    setSelected(item);
    setTitle(item.title);
    setText(item.text);
    setIsOpen(true);
  };

  const openEdit = (item: Tischspruch) => {
    setMode("edit");
    setSelected(item);
    setTitle(item.title);
    setText(item.text);
    setIsOpen(true);
  };

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.title.localeCompare(b.title)),
    [items]
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          {dict.tischsprueche.titleAll}
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
                onClick={openCreate}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-kitaYellow"
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
            <th>{dict.common.title}</th>
            <th className="hidden md:table-cell">{dict.common.text}</th>
            <th>{dict.common.actions}</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item) => (
            <tr
              key={item.id}
              className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kitaPurpleLight"
            >
              <td className="p-4 font-medium">{item.title}</td>
              <td className="hidden md:table-cell p-4 text-gray-600 line-clamp-2">
                {item.text}
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-kitaSky"
                    onClick={() => openView(item)}
                  >
                    <Image src="/view.png" alt="" width={16} height={16} />
                  </button>
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
                          const res = await deleteTischspruch(item.id);
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
                {mode === "create"
                  ? dict.tischsprueche.add
                  : mode === "edit"
                  ? dict.tischsprueche.edit
                  : dict.tischsprueche.view}
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
                  {dict.common.title}
                </label>
                <input
                  value={title}
                  readOnly={mode === "view"}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {dict.common.text}
                </label>
                <textarea
                  value={text}
                  readOnly={mode === "view"}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-36 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>

            {mode !== "view" && canManage && (
              <div className="mt-4 flex justify-end">
                <button
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white"
                  onClick={async () => {
                    if (mode === "create") {
                      const res = await createTischspruch({ title, text });
                      if (!res.success) return;
                      window.location.reload();
                      return;
                    }
                    if (mode === "edit" && selected) {
                      const res = await updateTischspruch(selected.id, { title, text });
                      if (!res.success) return;
                      setItems((prev) =>
                        prev.map((x) =>
                          x.id === selected.id ? { ...x, title, text } : x
                        )
                      );
                      setSelected((prev) => (prev ? { ...prev, title, text } : prev));
                      setIsOpen(false);
                    }
                  }}
                >
                  {dict.common.save}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
