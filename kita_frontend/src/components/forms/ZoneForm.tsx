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
  ZoneInput,
  zoneSchema,
  ZoneSchema,
} from "@/lib/formValidationSchemas";
import { createZone, updateZone } from "@/lib/actions";

export default function ZoneForm({
  type,
  data,
  setOpen,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const dict = useTranslations();
  const label = dict.entities?.zone ?? "zone";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ZoneInput, any, ZoneSchema>({
    resolver: zodResolver(zoneSchema),
  });

  const [state, formAction] = useFormState(
    type === "create" ? createZone : updateZone,
    { success: false, error: false }
  );

  const onSubmit = handleSubmit((form) => {
    formAction(form as ZoneSchema);
  });

  const router = useRouter();
  useEffect(() => {
    if (state.success) {
      const template =
        type === "create" ? dict.common.created : dict.common.updated;
      toast(template.replace("{label}", label));
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen, dict, label]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? dict.common.createEntity.replace("{label}", label)
          : dict.common.updateEntity.replace("{label}", label)}
      </h1>

      <div className="flex flex-col gap-4">
        <InputField
          label={dict.areasList.columns.name}
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />

        <InputField
          label={dict.forms.capacity}
          name="capacity"
          type="number"
          defaultValue={
            data?.capacity !== undefined && data?.capacity !== null
              ? String(data.capacity)
              : ""
          }
          register={register}
          error={errors?.capacity}
          inputProps={{ min: 1 }}
        />

        <div className="flex flex-col gap-2 w-full">
          <label className="text-xs text-gray-500">
            {dict.forms.description}
          </label>
          <textarea
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full min-h-[80px]"
            {...register("description")}
            defaultValue={data?.description ?? ""}
            placeholder={dict.areasList.descriptionPlaceholder}
          />
          {errors.description?.message && (
            <p className="text-xs text-red-400">
              {String(errors.description.message)}
            </p>
          )}
        </div>

        <InputField
          label={dict.forms.colorHint}
          name="color"
          defaultValue={data?.color ?? ""}
          register={register}
          error={errors?.color}
        />

        {data?.id && (
          <InputField
            label="id"
            name="id"
            defaultValue={data.id}
            register={register}
            hidden
          />
        )}
      </div>

      {state.error && (
        <span className="text-red-500">{dict.forms.somethingWentWrong}</span>
      )}

      <button className="bg-blue-400 text-white p-2 rounded-md w-max">
        {type === "create" ? dict.common.create : dict.common.update}
      </button>
    </form>
  );
}
