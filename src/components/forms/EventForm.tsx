"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useTranslations } from "@/i18n/TranslationsProvider";
import InputField from "../InputField";
import { EventInput, eventSchema, EventSchema } from "@/lib/formValidationSchemas";
import { createEvent, updateEvent } from "@/lib/actions";

export default function EventForm({
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
  const label = dict.entities?.event || "event";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventInput, any, EventSchema>({
    resolver: zodResolver(eventSchema),
  });

  const [state, formAction] = useFormState(
    type === "create" ? createEvent : updateEvent,
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

  const toLocalInput = (value?: Date | string) => {
    if (!value) return undefined;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  const classes = (relatedData?.classes || []) as { id: number; name: string }[];

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? dict.common.createEntity.replace("{label}", label)
          : dict.common.updateEntity.replace("{label}", label)}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label={dict.common.title}
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors?.title}
        />

        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <label className="text-xs text-gray-500">{dict.common.text}</label>
          <textarea
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full min-h-[96px]"
            {...register("description")}
            defaultValue={data?.description}
          />
          {errors.description?.message && (
            <p className="text-xs text-red-400">{errors.description.message.toString()}</p>
          )}
        </div>

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
          <label className="text-xs text-gray-500">{dict.forms.group}</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("classId")}
            defaultValue={data?.classId ?? ""}
          >
            <option value="">{dict.forms.none}</option>
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
      </div>

      {state.error && <span className="text-red-500">{dict.forms.somethingWentWrong}</span>}

      <button className="bg-blue-400 text-white p-2 rounded-md">
        {type === "create" ? dict.common.create : dict.common.update}
      </button>
    </form>
  );
}

