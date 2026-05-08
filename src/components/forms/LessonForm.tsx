"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useEffect, useMemo } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useTranslations } from "@/i18n/TranslationsProvider";
import InputField from "../InputField";
import { LessonInput, lessonSchema, LessonSchema } from "@/lib/formValidationSchemas";
import { createLesson, updateLesson } from "@/lib/actions";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
const DAY_BY_JS_DOW: Record<number, (typeof DAYS)[number] | null> = {
  0: null,
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: null,
};

export default function LessonForm({
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
  const label = dict.entities?.lesson || "lesson";

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LessonInput, any, LessonSchema>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      name: data?.name ?? "",
      // For create: day is derived from startTime (see effect below).
      // For update: keep persisted day.
      day: data?.day ?? "MONDAY",
      zoneId: data?.zoneId ?? "",
      classId: data?.classId,
      teacherId: data?.teacherId ?? "",
    },
  });

  const [state, formAction] = useFormState(
    type === "create" ? createLesson : updateLesson,
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

  const zones = useMemo(
    () => (relatedData?.zones ?? []) as { id: string; name: string }[],
    [relatedData?.zones]
  );
  const classes = useMemo(
    () => (relatedData?.classes ?? []) as { id: number; name: string }[],
    [relatedData?.classes]
  );
  const teachers = useMemo(
    () =>
      (relatedData?.teachers ?? []) as {
        id: string;
        name: string;
        surname: string;
      }[],
    [relatedData?.teachers]
  );

  useEffect(() => {
    if (data?.zoneId) setValue("zoneId", data.zoneId);
  }, [data?.zoneId, setValue]);

  // Create flow: remove manual "Day" input by deriving it from startTime.
  const startTimeValue = watch("startTime");
  useEffect(() => {
    if (type !== "create") return;
    const st = (startTimeValue ?? null) as Date | string | null;
    if (!st) return;
    const d = st instanceof Date ? st : new Date(st);
    if (Number.isNaN(d.getTime())) return;
    const mapped = DAY_BY_JS_DOW[d.getDay()] ?? null;
    if (mapped) {
      setValue("day", mapped as any, { shouldValidate: true });
    }
  }, [type, startTimeValue, setValue]);

  if (!relatedData) return <p>{dict.common.loading}</p>;

  const toLocalInput = (value?: Date | string) => {
    if (!value) return undefined;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? dict.common.createEntity.replace("{label}", label)
          : dict.common.updateEntity.replace("{label}", label)}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label={dict.forms.activity}
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />

        {type === "update" ? (
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">{dict.forms.day}</label>
            <select
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
              {...register("day")}
              defaultValue={data?.day}
            >
              {DAYS.map((d) => (
                <option value={d} key={d}>
                  {dict.forms.days?.[d] || d}
                </option>
              ))}
            </select>
            {errors.day?.message && (
              <p className="text-xs text-red-400">{errors.day.message.toString()}</p>
            )}
          </div>
        ) : null}

        <InputField
          label={dict.forms.startTime}
          name="startTime"
          type="datetime-local"
          defaultValue={toLocalInput(data?.startTime)}
          register={register}
          error={errors?.startTime}
        />
        <InputField
          label={dict.forms.endTime}
          name="endTime"
          type="datetime-local"
          defaultValue={toLocalInput(data?.endTime)}
          register={register}
          error={errors?.endTime}
        />

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
          <label className="text-xs text-gray-500">{dict.forms.playArea}</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("zoneId")}
          >
            <option value="">{dict.forms.none}</option>
            {zones.map((z) => (
              <option value={z.id} key={z.id}>
                {z.name}
              </option>
            ))}
          </select>
          {errors.zoneId?.message && (
            <p className="text-xs text-red-400">{errors.zoneId.message.toString()}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{dict.forms.group}</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("classId")}
            defaultValue={data?.classId}
          >
            {classes.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.classId?.message && (
            <p className="text-xs text-red-400">{errors.classId.message.toString()}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{dict.forms.educator}</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("teacherId")}
            defaultValue={data?.teacherId}
          >
            {teachers.map((t) => (
              <option value={t.id} key={t.id}>
                {t.name} {t.surname}
              </option>
            ))}
          </select>
          {errors.teacherId?.message && (
            <p className="text-xs text-red-400">{errors.teacherId.message.toString()}</p>
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
