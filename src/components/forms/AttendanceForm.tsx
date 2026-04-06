"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useTranslations } from "@/i18n/TranslationsProvider";
import InputField from "../InputField";
import {
  AttendanceInput,
  attendanceSchema,
  AttendanceSchema,
} from "@/lib/formValidationSchemas";
import { createAttendance, updateAttendance } from "@/lib/actions";

export default function AttendanceForm({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) {
  const dict = useTranslations();
  const label = dict.entities?.attendance || "attendance";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AttendanceInput, any, AttendanceSchema>({
    resolver: zodResolver(attendanceSchema),
  });

  const [state, formAction] = useFormState(
    type === "create" ? createAttendance : updateAttendance,
    { success: false, error: false }
  );

  const onSubmit = handleSubmit((form) => {
    formAction(form as any);
  });

  const router = useRouter();
  useEffect(() => {
    if (state.success) {
      const template = type === "create" ? dict.common.created : dict.common.updated;
      toast(template.replace("{label}", label));
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen, dict, label]);

  const students = (relatedData?.students || []) as { id: string; name: string; surname: string }[];
  const lessons = (relatedData?.lessons || []) as { id: number; name: string }[];

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? dict.common.createEntity.replace("{label}", label)
          : dict.common.updateEntity.replace("{label}", label)}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label={dict.forms.date}
          name="date"
          type="date"
          defaultValue={data?.date?.toISOString?.()?.split("T")[0]}
          register={register}
          error={errors?.date}
        />

        <div className="flex items-center gap-2 w-full md:w-1/4">
          <input type="checkbox" className="h-4 w-4" {...register("present")} defaultChecked={!!data?.present} />
          <label className="text-xs text-gray-500">{dict.dashboard.present}</label>
        </div>

        {data && (
          <InputField
            label="Id"
            name="id"
            defaultValue={String(data?.id)}
            register={register}
            error={errors?.id}
            hidden
          />
        )}

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{dict.dashboard.children}</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("studentId")}
            defaultValue={data?.studentId}
          >
            {students.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name} {s.surname}
              </option>
            ))}
          </select>
          {errors.studentId?.message && (
            <p className="text-xs text-red-400">{errors.studentId.message.toString()}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{dict.forms.lesson}</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("lessonId")}
            defaultValue={data?.lessonId}
          >
            {lessons.map((l) => (
              <option value={l.id} key={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          {errors.lessonId?.message && (
            <p className="text-xs text-red-400">{errors.lessonId.message.toString()}</p>
          )}
        </div>
      </div>

      {state.error && <span className="text-red-500">{dict.forms.somethingWentWrong}</span>}

      <button className="bg-blue-400 text-white p-2 rounded-md">
        {type === "create" ? dict.common.create : dict.common.update}
      </button>
    </form>
  );
}

