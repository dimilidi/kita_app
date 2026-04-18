"use client";

import {
  createTischspruch,
  deleteTischspruch,
  updateTischspruch,
} from "@/lib/actions";
import FilterDropdown from "@/components/filter/FilterDropdown";
import FilterPanel from "@/components/filter/FilterPanel";
import ResetFiltersButton from "@/components/filter/ResetFiltersButton";
import SearchInput from "@/components/search/SearchInput";
import SortDropdown from "@/components/sort/SortDropdown";
import SortPanel from "@/components/sort/SortPanel";
import Image from "next/image";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

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

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          {dict.tischsprueche.titleAll}
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <SearchInput />

          <div className="flex flex-wrap items-center justify-end gap-3 self-end">
            <FilterPanel title={dict.common.filters}>
              <FilterDropdown
                label={dict.tischsprueche.filters.votes}
                paramKey="popular"
                allowClear={false}
                options={[
                  { label: dict.common.all, value: "" },
                  { label: dict.tischsprueche.filters.popularOnly, value: "true" },
                ]}
              />
            </FilterPanel>

            <SortPanel title={dict.common.sortBy}>
              <SortDropdown
                options={[
                  { label: dict.common.title, value: "title" },
                  { label: dict.tischsprueche.sort.votes, value: "votes" },
                  { label: dict.common.created, value: "createdAt" },
                ]}
                defaultSort="createdAt"
                defaultOrder="desc"
              />
            </SortPanel>

            <ResetFiltersButton label={dict.common.resetFilters} />

            {canManage && (
              <button
                onClick={openCreate}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-kitaYellow"
                type="button"
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
          {items.map((item) => (
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
                    type="button"
                  >
                    <Image src="/view.png" alt="" width={16} height={16} />
                  </button>
                  {canManage && (
                    <>
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-kitaYellow"
                        onClick={() => openEdit(item)}
                        type="button"
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
                        type="button"
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
                type="button"
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
                  type="button"
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
