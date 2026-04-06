"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useTranslations } from "@/i18n/TranslationsProvider";
import InputField from "../InputField";
import { ResultInput, resultSchema, ResultSchema } from "@/lib/formValidationSchemas";
import { createResult, updateResult } from "@/lib/actions";

export default function ResultForm({
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
  const label = dict.entities?.result || "result";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResultInput, any, ResultSchema>({
    resolver: zodResolver(resultSchema),
  });

  const [state, formAction] = useFormState(
    type === "create" ? createResult : updateResult,
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
  const exams = (relatedData?.exams || []) as { id: number; title: string }[];
  const assignments = (relatedData?.assignments || []) as { id: number; title: string }[];

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? dict.common.createEntity.replace("{label}", label)
          : dict.common.updateEntity.replace("{label}", label)}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label={dict.results.columns.score}
          name="score"
          type="number"
          defaultValue={data?.score?.toString?.()}
          register={register}
          error={errors?.score}
          inputProps={{ min: 0 }}
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
          <label className="text-xs text-gray-500">{dict.results.columns.student}</label>
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
          <label className="text-xs text-gray-500">{dict.menu.exams}</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("examId")}
            defaultValue={data?.examId ?? ""}
          >
            <option value="">{dict.forms.none}</option>
            {exams.map((e) => (
              <option value={e.id} key={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          {errors.examId?.message && (
            <p className="text-xs text-red-400">{errors.examId.message.toString()}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{dict.menu.assignments}</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("assignmentId")}
            defaultValue={data?.assignmentId ?? ""}
          >
            <option value="">{dict.forms.none}</option>
            {assignments.map((a) => (
              <option value={a.id} key={a.id}>
                {a.title}
              </option>
            ))}
          </select>
          {errors.assignmentId?.message && (
            <p className="text-xs text-red-400">{errors.assignmentId.message.toString()}</p>
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

