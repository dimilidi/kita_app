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
import { sendPeerEducatorEmail } from "@/lib/actions";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "react-toastify";

function groupEntriesForTeacher(item: {
  classes?: { id: number; name: string }[];
  lessons?: { class?: { id: number; name: string } | null }[];
}): { id: number; name: string }[] {
  const map = new Map<number, string>();
  for (const c of item.classes ?? []) {
    map.set(c.id, c.name);
  }
  for (const l of item.lessons ?? []) {
    const c = l.class;
    if (c) map.set(c.id, c.name);
  }
  return Array.from(map.entries())
    .sort((a, b) =>
      a[1].localeCompare(b[1], undefined, { sensitivity: "base" })
    )
    .map(([id, name]) => ({ id, name }));
}

/** Wide enough for 4 activity badges + “+N more” within two rows (Lesson1-style names). */
const COL_ACTIVITIES = "hidden md:table-cell w-[16rem] max-w-[16rem]";
const COL_AREAS = "hidden md:table-cell w-[8.5rem] max-w-[8.5rem]";
const COL_PHONE = "hidden lg:table-cell w-[7rem] pr-8";
const COL_ADDRESS = "hidden lg:table-cell min-w-0 pl-6";
const BADGE_WRAP = "flex flex-wrap gap-1 min-w-0 max-w-full max-h-[3.25rem] overflow-hidden";
const ACTIVITY_WRAP =
  "flex flex-wrap gap-1 min-w-0 max-w-full max-h-[3.25rem] overflow-hidden content-start items-center";
const ACTIVITY_BADGE =
  "inline-flex items-center h-6 px-2 text-xs rounded-md bg-blue-100 text-blue-700 shrink-0";
const ACTION_BTN =
  "w-10 h-10 shrink-0 flex items-center justify-center rounded-full";
const COL_ACTIONS = "w-[7rem]";

const MAX_VISIBLE_ACTIVITIES = 4;

function ActivityBadges({
  lessons,
  moreTemplate,
}: {
  lessons: { id: string | number; name: string }[];
  moreTemplate: string;
}) {
  const hasOverflow = lessons.length > MAX_VISIBLE_ACTIVITIES;
  const visible = lessons.slice(0, MAX_VISIBLE_ACTIVITIES);
  const hidden = lessons.slice(MAX_VISIBLE_ACTIVITIES);
  const hiddenTooltip = hidden.map((l) => l.name).join(", ");

  if (lessons.length === 0) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <div className={ACTIVITY_WRAP}>
      {visible.map((lesson) => (
        <span key={lesson.id} className={ACTIVITY_BADGE}>
          {lesson.name}
        </span>
      ))}
      {hasOverflow ? (
        <span
          className={`${ACTIVITY_BADGE} bg-blue-50 text-blue-600`}
          title={hiddenTooltip}
        >
          {moreTemplate.replace("{count}", String(hidden.length))}
        </span>
      ) : null}
    </div>
  );
}

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
  const tc = dict.teachers;

  const isAdmin = role === "admin";
  const isTeacher = role === "teacher";

  const [contactId, setContactId] = useState<string | null>(null);
  const [contactSubject, setContactSubject] = useState("");
  const [contactMsg, setContactMsg] = useState("");
  const [contactSending, setContactSending] = useState(false);

  const columns = isAdmin
    ? [
        { header: dict.teachers.columns.info, accessor: "info" },
        {
          header: dict.teachers.columns.teacherId,
          accessor: "teacherId",
          className: "hidden md:table-cell w-[7rem]",
        },
        {
          header: dict.teachers.columns.activities,
          accessor: "activities",
          className: COL_ACTIVITIES,
        },
        {
          header: dict.teachers.columns.areas,
          accessor: "areas",
          className: COL_AREAS,
        },
        {
          header: dict.teachers.columns.phone,
          accessor: "phone",
          className: COL_PHONE,
        },
        {
          header: dict.teachers.columns.address,
          accessor: "address",
          className: COL_ADDRESS,
        },
        { header: dict.common.actions, accessor: "action", className: COL_ACTIONS },
      ]
    : [
        { header: dict.teachers.columns.info, accessor: "info" },
        {
          header: dict.teachers.columns.activities,
          accessor: "activities",
          className: COL_ACTIVITIES,
        },
        {
          header: dict.teachers.columns.groups,
          accessor: "groups",
          className: "hidden md:table-cell w-[10.5rem] max-w-[10.5rem]",
        },
        { header: dict.common.actions, accessor: "action", className: COL_ACTIONS },
      ];

  const activitiesMoreLabel =
    tc.activitiesMore ?? "+{count} more";

  const renderRow = (item: any) => {
    const groupEntries = groupEntriesForTeacher(item);

    if (isAdmin) {
      return (
        <tr
          key={item.id}
          className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kitaPurpleLight"
        >
          <td className="align-top p-4 min-w-0">
            <div className="flex items-center gap-4 min-w-0">
            <Image
              src={item.img || "/noAvatar.png"}
              alt=""
              width={40}
              height={40}
              className="md:hidden xl:block w-10 h-10 rounded-full object-cover shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <h3 className="font-semibold">
                {item.name} {item.surname}
              </h3>
              <p className="text-xs text-gray-500 break-all">{item?.email}</p>
            </div>
            </div>
          </td>
          <td className="hidden md:table-cell align-top p-4 w-[7rem]">{item.username}</td>
          <td className={`${COL_ACTIVITIES} align-top p-4`}>
            <ActivityBadges
              lessons={item.lessons ?? []}
              moreTemplate={activitiesMoreLabel}
            />
          </td>
          <td className={`${COL_AREAS} align-top p-4 whitespace-normal break-words`}>
            {(item.zones || [])
              .map((z: { zone?: { name: string } | null }) => z.zone?.name)
              .filter(Boolean)
              .join(", ") || "—"}
          </td>
          <td className={`${COL_PHONE} align-top py-4 pl-4`}>{item.phone ?? "—"}</td>
          <td className={`${COL_ADDRESS} align-top py-4 pr-4 whitespace-normal break-words`}>
            {item.address ?? "—"}
          </td>
          <td className={`${COL_ACTIONS} p-4 align-middle`}>
            <div className="flex items-center gap-2">
              <Link href={`/list/teachers/${item.id}`} className="shrink-0">
                <button
                  type="button"
                  className={`${ACTION_BTN} bg-kitaSky`}
                  aria-label="View details"
                >
                  <Image src="/view.png" alt="" width={16} height={16} />
                </button>
              </Link>
              <div className="shrink-0 [&>button]:w-10 [&>button]:h-10 [&>button]:shrink-0 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full">
                <FormModal table="teacher" type="delete" id={item.id} />
              </div>
            </div>
          </td>
        </tr>
      );
    }

    if (isTeacher) {
      return (
        <tr
          key={item.id}
          className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kitaPurpleLight"
        >
          <td className="p-4">
            <div className="flex items-center gap-4">
              <Image
                src={item.img || "/noAvatar.png"}
                alt=""
                width={40}
                height={40}
                className="hidden sm:block w-10 h-10 rounded-full object-cover shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <h3 className="font-semibold">
                  {item.name} {item.surname}
                </h3>
              </div>
            </div>
          </td>
          <td className={`${COL_ACTIVITIES} p-4`}>
            <ActivityBadges
              lessons={item.lessons ?? []}
              moreTemplate={activitiesMoreLabel}
            />
          </td>
          <td className="hidden md:table-cell w-[10.5rem] max-w-[10.5rem] p-4">
            {groupEntries.length > 0 ? (
              <div className={BADGE_WRAP}>
                {groupEntries.map((g) => (
                  <span
                    key={g.id}
                    className="px-2 py-1 text-xs rounded-md bg-emerald-50 text-emerald-900 border border-emerald-100"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </td>
          <td>
            <button
              type="button"
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white ring-1 ring-gray-200 hover:bg-gray-50"
              title={tc.messageIconTitle ?? "Send Message"}
              aria-label={tc.messageIconTitle ?? "Send Message"}
              onClick={() => {
                setContactId(item.id);
                setContactSubject("");
                setContactMsg("");
              }}
            >
              <Mail className="w-4 h-4 text-gray-800" aria-hidden />
            </button>
          </td>
        </tr>
      );
    }

    return (
      <tr key={item.id} className="border-b border-gray-200">
        <td colSpan={columns.length} className="p-4 text-gray-400 text-sm">
          —
        </td>
      </tr>
    );
  };

  const onSendContact = async () => {
    if (!contactId || contactSending) return;
    const msg = contactMsg.trim();
    if (!msg) {
      toast.error(tc.contactEmpty ?? "Please enter a message.");
      return;
    }
    setContactSending(true);
    try {
      const res = await sendPeerEducatorEmail({
        recipientTeacherId: contactId,
        subject: contactSubject.trim() || undefined,
        message: msg,
      });
      if (res.ok) {
        toast.success(tc.contactSuccess ?? "Message sent.");
        setContactId(null);
        setContactSubject("");
        setContactMsg("");
        return;
      }
      if (res.error === "self") {
        toast.error(tc.contactSelf ?? "You cannot message yourself.");
      } else if (res.error === "no_recipient_email") {
        toast.error(tc.contactNoEmail ?? "This educator has no email on file.");
      } else if (res.error === "email_not_configured") {
        toast.error(tc.contactNotConfigured ?? "Email sending is not configured.");
      } else {
        toast.error(tc.contactError ?? "Could not send message.");
      }
    } finally {
      setContactSending(false);
    }
  };

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

            {isAdmin ? (
              <FormModal table="teacher" type="create" relatedData={relatedData} />
            ) : null}
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="mt-6 text-sm text-gray-500">{dict.common.noResults}</div>
      ) : null}
      <Table
        columns={columns}
        renderRow={renderRow}
        data={data}
        tableClassName="w-full mt-4 table-fixed border-collapse"
      />
      <Pagination page={page} count={count} />

      {isTeacher && contactId ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="educator-contact-modal-title"
          onClick={() => !contactSending && setContactId(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="educator-contact-modal-title"
              className="text-sm font-semibold text-gray-900 mb-3"
            >
              {tc.contactModalTitle ?? "Message educator"}
            </h3>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              {tc.contactSubjectLabel ?? "Subject (optional)"}
            </label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm ring-[1.5px] ring-transparent focus:ring-kitaSky focus:border-kitaSky outline-none mb-3"
              value={contactSubject}
              onChange={(e) => setContactSubject(e.target.value)}
              disabled={contactSending}
              placeholder={tc.contactSubjectLabel ?? "Subject (optional)"}
            />
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              {tc.contactMessageLabel ?? "Message"}
            </label>
            <textarea
              className="w-full min-h-[7rem] border border-gray-300 rounded-md px-3 py-2 text-sm ring-[1.5px] ring-transparent focus:ring-kitaSky focus:border-kitaSky outline-none"
              value={contactMsg}
              onChange={(e) => setContactMsg(e.target.value)}
              disabled={contactSending}
              placeholder={tc.contactMessageLabel ?? "Message"}
              required
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-60"
                disabled={contactSending}
                onClick={() => setContactId(null)}
              >
                {dict.common.close}
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-md bg-kitaYellow hover:opacity-90 disabled:opacity-60"
                disabled={contactSending || !contactMsg.trim()}
                onClick={() => void onSendContact()}
              >
                {contactSending
                  ? tc.contactSending ?? dict.dashboard?.sending ?? "Sending…"
                  : tc.contactSend ?? dict.dashboard?.send ?? "Send"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
