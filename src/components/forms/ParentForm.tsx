"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { Dispatch, SetStateAction, useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useTranslations } from "@/i18n/TranslationsProvider";
import { ParentInput, parentSchema, ParentSchema } from "@/lib/formValidationSchemas";
import { createParent, updateParent } from "@/lib/actions";

export default function ParentForm({
  type,
  data,
  setOpen,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const dict = useTranslations();
  const label = dict.entities?.parent || "parent";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ParentInput, any, ParentSchema>({
    resolver: zodResolver(parentSchema),
  });

  const [state, formAction] = useFormState(
    type === "create" ? createParent : updateParent,
    { success: false, error: false }
  );

  const onSubmit = handleSubmit((form) => {
    formAction(form);
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

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? dict.common.createEntity.replace("{label}", label)
          : dict.common.updateEntity.replace("{label}", label)}
      </h1>

      <span className="text-xs text-gray-400 font-medium">{dict.forms.authInfo}</span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label={dict.forms.username}
          name="username"
          defaultValue={data?.username}
          register={register}
          error={errors?.username}
        />
        <InputField
          label={dict.forms.email}
          name="email"
          defaultValue={data?.email}
          register={register}
          error={errors?.email}
        />
        <InputField
          label={dict.forms.password}
          name="password"
          type="password"
          defaultValue={data?.password}
          register={register}
          error={errors?.password}
        />
      </div>

      <span className="text-xs text-gray-400 font-medium">{dict.forms.personalInfo}</span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label={dict.forms.firstName}
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors.name}
        />
        <InputField
          label={dict.forms.lastName}
          name="surname"
          defaultValue={data?.surname}
          register={register}
          error={errors.surname}
        />
        <InputField
          label={dict.forms.phone}
          name="phone"
          defaultValue={data?.phone}
          register={register}
          error={errors.phone}
        />
        <InputField
          label={dict.forms.address}
          name="address"
          defaultValue={data?.address}
          register={register}
          error={errors.address}
        />

        {data && (
          <InputField
            label="Id"
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors?.id}
            hidden
          />
        )}
      </div>

      {state.error && <span className="text-red-500">{dict.forms.somethingWentWrong}</span>}

      <button className="bg-blue-400 text-white p-2 rounded-md">
        {type === "create" ? dict.common.create : dict.common.update}
      </button>
    </form>
  );
}

