"use client";

import {
  deleteAnnouncement,
  deleteZone,
  deleteAttendance,
  deleteClass,
  deleteEvent,
  deleteLesson,
  deleteParent,
  deleteStudent,
  deleteTeacher,
} from "@/lib/actions";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dispatch, FormEvent, SetStateAction, useState } from "react";
import { toast } from "react-toastify";
import { FormContainerProps } from "./FormContainer";
import {
  useTranslations,
  type Dictionary,
} from "@/i18n/TranslationsProvider";


const deleteActionMap = {
  class: deleteClass,
  teacher: deleteTeacher,
  student: deleteStudent,
  parent: deleteParent,
  lesson: deleteLesson,
  attendance: deleteAttendance,
  event: deleteEvent,
  announcement: deleteAnnouncement,
  zone: deleteZone,
} as const;

type DeleteTable = keyof typeof deleteActionMap;

const DELETE_FORM_INITIAL_STATE = { success: false, error: false };

function DeleteConfirmationForm({
  table,
  id,
  label,
  onClose,
  dict,
}: {
  table: DeleteTable;
  id: string | number;
  label: string;
  onClose: () => void;
  dict: Dictionary;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await deleteActionMap[table](
        DELETE_FORM_INITIAL_STATE,
        formData
      );
      if (result.success) {
        const deletedTemplate =
          dict.common.deleted ?? "{label} has been deleted!";
        toast.success(deletedTemplate.replace("{label}", label));
        onClose();
        router.refresh();
      } else {
        if (table === "zone" && "inUse" in result && result.inUse) {
          toast.error(dict.areasList.deleteInUse);
        } else if ("message" in result && typeof result.message === "string" && result.message) {
          toast.error(result.message);
        } else {
          toast.error(dict.forms.somethingWentWrong);
        }
      }
    } catch {
      toast.error(dict.forms.somethingWentWrong);
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 flex flex-col gap-4"
      aria-busy={pending}
    >
      <input type="hidden" name="id" value={String(id)} readOnly />
      <span className="text-center font-medium">
        {dict.common.deleteConfirm}
        {label}
      </span>
      <button
        type="submit"
        disabled={pending}
        className="bg-red-700 text-white py-2 px-4 rounded-md border-none w-max self-center disabled:opacity-60"
      >
        {pending ? dict.common.loading : dict.common.delete}
      </button>
    </form>
  );
}

// USE LAZY LOADING

// import TeacherForm from "./forms/TeacherForm";
// import StudentForm from "./forms/StudentForm";

const LoadingFallback = () => {
  const dict = useTranslations();
  return <h1>{dict.common.loading}</h1>;
};

const TeacherForm = dynamic(() => import("./forms/TeacherForm"), {
  loading: () => <LoadingFallback />,
});
const StudentForm = dynamic(() => import("./forms/StudentForm"), {
  loading: () => <LoadingFallback />,
});
const ClassForm = dynamic(() => import("./forms/ClassForm"), {
  loading: () => <LoadingFallback />,
});
const ParentForm = dynamic(() => import("./forms/ParentForm"), {
  loading: () => <LoadingFallback />,
});
const LessonForm = dynamic(() => import("./forms/LessonForm"), {
  loading: () => <LoadingFallback />,
});
const AttendanceForm = dynamic(() => import("./forms/AttendanceForm"), {
  loading: () => <LoadingFallback />,
});
const EventForm = dynamic(() => import("./forms/EventForm"), {
  loading: () => <LoadingFallback />,
});
const AnnouncementForm = dynamic(() => import("./forms/AnnouncementForm"), {
  loading: () => <LoadingFallback />,
});
const ZoneForm = dynamic(() => import("./forms/ZoneForm"), {
  loading: () => <LoadingFallback />,
});
// TODO: OTHER FORMS

const forms: {
  [key: string]: (
    setOpen: Dispatch<SetStateAction<boolean>>,
    type: "create" | "update",
    data?: any,
    relatedData?: any,
    variant?: "admin" | "self"
  ) => JSX.Element;
} = {
  class: (setOpen, type, data, relatedData) => (
    <ClassForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  teacher: (setOpen, type, data, relatedData, variant) => (
    <TeacherForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
      variant={variant}
    />
  ),
  student: (setOpen, type, data, relatedData, variant) => (
    <StudentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
      variant={variant}
    />
  ),
  parent: (setOpen, type, data) => (
    <ParentForm type={type} data={data} setOpen={setOpen} />
  ),
  lesson: (setOpen, type, data, relatedData) => (
    <LessonForm type={type} data={data} setOpen={setOpen} relatedData={relatedData} />
  ),
  attendance: (setOpen, type, data, relatedData) => (
    <AttendanceForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  event: (setOpen, type, data, relatedData) => (
    <EventForm type={type} data={data} setOpen={setOpen} relatedData={relatedData} />
  ),
  announcement: (setOpen, type, data, relatedData) => (
    <AnnouncementForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  zone: (setOpen, type, data) => (
    <ZoneForm type={type} data={data} setOpen={setOpen} />
  ),
};

const FormModal = ({
  table,
  type,
  data,
  id,
  variant,
  relatedData,
}: FormContainerProps & { relatedData?: any }) => {
  const dict = useTranslations();
  const label = dict.entities?.[table] || table;

  const size = type === "create" ? "w-8 h-8" : "w-7 h-7";
  const bgColor =
    type === "create"
      ? "bg-kitaYellow"
      : type === "update"
      ? "bg-kitaSky"
      : "bg-kitaPurple";

  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={`${size} flex items-center justify-center rounded-full ${bgColor}`}
        onClick={() => setOpen(true)}
      >
        <Image src={`/${type}.png`} alt="" width={16} height={16} />
      </button>
      {open && (
        <div className="w-screen h-screen absolute left-0 top-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-md relative w-[90%] md:w-[70%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%]">
            {type === "delete" ? (
              id != null && id !== "" ? (
                <DeleteConfirmationForm
                  table={table}
                  id={id}
                  label={label}
                  onClose={() => setOpen(false)}
                  dict={dict}
                />
              ) : (
                dict.common.formNotFound ?? "Form not found!"
              )
            ) : type === "create" || type === "update" ? (
              forms[table](setOpen, type, data, relatedData, variant)
            ) : (
              dict.common.formNotFound ?? "Form not found!"
            )}
            <div
              className="absolute top-4 right-4 cursor-pointer"
              onClick={() => setOpen(false)}
            >
              <Image src="/close.png" alt="" width={14} height={14} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FormModal;