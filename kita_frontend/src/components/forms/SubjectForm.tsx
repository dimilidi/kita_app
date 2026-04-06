"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useEffect, useMemo } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useTranslations } from "@/i18n/TranslationsProvider";
import InputField from "../InputField";
import {
  SubjectInput,
  subjectSchema,
  SubjectSchema,
} from "@/lib/formValidationSchemas";
import { createSubject, updateSubject } from "@/lib/actions";

export default function SubjectForm({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: {
    id?: number;
    name?: string;
    teachers?: { id: string; name: string; surname: string }[];
  };
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: {
    teachers?: { id: string; name: string; surname: string }[];
  };
}) {
  const dict = useTranslations();
  const label = dict.entities?.subject ?? "subject";

  const teacherList = useMemo(
    () => relatedData?.teachers ?? [],
    [relatedData?.teachers]
  );

  const defaultTeachers = useMemo(
    () =>
      Array.isArray(data?.teachers)
        ? data.teachers.map((t) => t.id)
        : ([] as string[]),
    [data?.teachers]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubjectInput, unknown, SubjectSchema>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: data?.name ?? "",
      teachers: defaultTeachers,
      id: data?.id,
    },
  });

  const [state, formAction] = useFormState(
    type === "create" ? createSubject : updateSubject,
    { success: false, error: false }
  );

  const onSubmit = handleSubmit((form) => {
    formAction(subjectSchema.parse(form));
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

  if (!relatedData) {
    return <p>{dict.common.loading}</p>;
  }

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? dict.common.createEntity.replace("{label}", label)
          : dict.common.updateEntity.replace("{label}", label)}
      </h1>

      <div className="flex flex-wrap gap-4">
        <InputField
          label={dict.subjects?.columns?.subjectName ?? "Name"}
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors.name}
        />
        {type === "update" && data?.id != null && (
          <InputField
            label="Id"
            name="id"
            defaultValue={String(data.id)}
            register={register}
            error={errors.id}
            hidden
          />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-gray-500">
          {dict.subjects?.columns?.teachers ?? "Teachers"}
        </span>
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto rounded-md border border-gray-200 p-3">
          {teacherList.length === 0 ? (
            <span className="text-xs text-gray-400">
              {dict.common.loading}
            </span>
          ) : (
            teacherList.map((t) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  value={t.id}
                  {...register("teachers")}
                />
                <span>
                  {t.name} {t.surname}
                </span>
              </label>
            ))
          )}
        </div>
        {errors.teachers?.message && (
          <p className="text-xs text-red-400">
            {String(errors.teachers.message)}
          </p>
        )}
      </div>

      {state.error && (
        <span className="text-red-500">{dict.forms.somethingWentWrong}</span>
      )}

      <button type="submit" className="bg-blue-400 text-white p-2 rounded-md">
        {type === "create" ? dict.common.create : dict.common.update}
      </button>
    </form>
  );
}
