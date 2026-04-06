"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { StudentInput, studentSchema, StudentSchema } from "@/lib/formValidationSchemas";
import { useFormState } from "react-dom";
import { createStudent, updateStudent } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CldImage, CldUploadWidget } from "next-cloudinary";
import { useTranslations } from "@/i18n/TranslationsProvider";

const StudentForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const dict = useTranslations();
  const label = dict.entities?.student || "student";

  const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

  const grades = (relatedData?.grades ?? []) as { id: number; level: number }[];
  const classes = (relatedData?.classes ?? []) as {
    id: number;
    name: string;
    capacity: number;
    gradeId: number;
    _count: { students: number };
  }[];
  const parents = (relatedData?.parents ?? []) as {
    id: string;
    name: string;
    surname: string;
  }[];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StudentInput, any, StudentSchema>({
    resolver: zodResolver(studentSchema),
  });

  const [img, setImg] = useState<any>();

  const [state, formAction] = useFormState(
    type === "create" ? createStudent : updateStudent,
    {
      success: false,
      error: false,
    }
  );

  const onSubmit = handleSubmit((formData) => {
    formAction({ ...formData, img: img?.secure_url });
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

  const calcAge = (birthday: Date) => {
    const now = new Date();
    let age = now.getFullYear() - birthday.getFullYear();
    const m = now.getMonth() - birthday.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthday.getDate())) age--;
    return age;
  };

  const getAgeGroupKey = (age: number | null) => {
    if (age === null || Number.isNaN(age)) return null;
    if (age >= 1 && age < 3) return "nursery" as const;
    if (age >= 3 && age <= 6) return "kindergarten" as const;
    return null;
  };

  const birthdayValue = watch("birthday");
  const birthdayDate =
    birthdayValue instanceof Date
      ? birthdayValue
      : birthdayValue
        ? new Date(birthdayValue as string)
        : data?.birthday
          ? new Date(data.birthday)
          : null;
  const age =
    birthdayDate && !Number.isNaN(birthdayDate.getTime()) ? calcAge(birthdayDate) : null;
  const ageGroupKey = getAgeGroupKey(age);
  const allowedGradeLevel =
    ageGroupKey === "nursery" ? 1 : ageGroupKey === "kindergarten" ? 2 : null;
  const filteredClasses =
    allowedGradeLevel === null
      ? []
      : classes.filter((classItem) => {
          const classGrade = grades.find((g) => g.id === classItem.gradeId);
          return classGrade?.level === allowedGradeLevel;
        });

  // Keep required gradeId in sync with selected class.
  const selectedClassId = watch("classId");
  useEffect(() => {
    const selectedClass = classes.find(
      (c) => String(c.id) === String(selectedClassId ?? data?.classId ?? "")
    );
    if (selectedClass?.gradeId) {
      setValue("gradeId", selectedClass.gradeId as any, { shouldValidate: true });
    }
  }, [classes, selectedClassId, data?.classId, setValue]);

  // If age group changes, clear class selection when it no longer matches.
  useEffect(() => {
    const selectedClass = classes.find(
      (c) => String(c.id) === String(selectedClassId ?? "")
    );
    const selectedGrade = grades.find((g) => g.id === selectedClass?.gradeId);
    const stillValid =
      allowedGradeLevel !== null && selectedGrade?.level === allowedGradeLevel;

    if (!stillValid) {
      setValue("classId", "" as any, { shouldValidate: true });
      setValue("gradeId", "" as any, { shouldValidate: true });
    }
  }, [allowedGradeLevel, classes, grades, selectedClassId, setValue]);

  if (!relatedData) return <p>{dict.common.loading}</p>;

  const birthdayDefault = data?.birthday
    ? new Date(data.birthday).toISOString().split("T")[0]
    : undefined;

console.log("CLOUDINARY NAME:", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
console.log("ALL ENV:", process.env);


  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
    

    
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? dict.common.createEntity.replace("{label}", label)
          : dict.common.updateEntity.replace("{label}", label)}
      </h1>
      <span className="text-xs text-gray-400 font-medium">
        {dict.forms.authInfo}
      </span>
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{dict.forms.username}</label>
          <input
            type="text"
            {...register("username")}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            defaultValue={data?.username}
          />
          {errors?.username?.message && (
            <p className="text-xs text-red-400">
              {errors.username.message.toString().startsWith("forms.")
                ? (dict.forms?.[
                    errors.username.message.toString().replace("forms.", "")
                  ] as string | undefined) ?? errors.username.message.toString()
                : errors.username.message.toString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{dict.forms.password}</label>
          <input
            type="password"
            {...register("password")}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            defaultValue={data?.password}
          />
          {errors?.password?.message && (
            <p className="text-xs text-red-400">
              {errors.password.message.toString().startsWith("forms.")
                ? (dict.forms?.[
                    errors.password.message.toString().replace("forms.", "")
                  ] as string | undefined) ?? errors.password.message.toString()
                : errors.password.message.toString()}
            </p>
          )}
        </div>
      </div>
      <span className="text-xs text-gray-400 font-medium">
        {dict.forms.personalInfo}
      </span>
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
        {/* Address is required by the Student model, but kindergarten UI keeps it non-editable */}
        <InputField
          label={dict.forms.address}
          name="address"
          defaultValue={data?.address ?? ""}
          register={register}
          error={errors.address}
          hidden
        />
        <InputField
          label={dict.forms.bloodGroup}
          name="bloodType"
          defaultValue={data?.bloodType}
          register={register}
          error={errors.bloodType}
          hidden
        />
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{dict.forms.bloodGroup}</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("bloodType")}
            defaultValue={data?.bloodType ?? ""}
          >
            <option value="">{dict.forms.none}</option>
            {BLOOD_GROUPS.map((g) => (
              <option value={g} key={g}>
                {g}
              </option>
            ))}
          </select>
          {errors.bloodType?.message && (
            <p className="text-xs text-red-400">
              {errors.bloodType.message.toString()}
            </p>
          )}
        </div>
        <InputField
          label={dict.forms.birthday}
          name="birthday"
          defaultValue={birthdayDefault}
          register={register}
          error={errors.birthday}
          type="date"
        />
        <InputField
          label="gradeId"
          name="gradeId"
          defaultValue={data?.gradeId}
          register={register}
          error={errors.gradeId}
          hidden
        />

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{dict.forms.parent}</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("parentId")}
            defaultValue={data?.parentId ?? ""}
          >
            <option value="" disabled>
              {dict.forms.selectParent}
            </option>
            {parents.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name} {p.surname}
              </option>
            ))}
          </select>
          {errors.parentId?.message && (
            <p className="text-xs text-red-400">
              {errors.parentId.message.toString()}
            </p>
          )}
        </div>
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
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{dict.forms.sex}</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("sex")}
            defaultValue={data?.sex}
          >
            <option value="MALE">{dict.forms.male}</option>
            <option value="FEMALE">{dict.forms.female}</option>
          </select>
          {errors.sex?.message && (
            <p className="text-xs text-red-400">
              {errors.sex.message.toString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{dict.forms.group}</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("classId")}
            defaultValue={data?.classId ?? ""}
            disabled={allowedGradeLevel === null}
          >
            <option value="" disabled>
              {allowedGradeLevel === null
                ? "Select birthday first"
                : dict.forms.selectClass}
            </option>
            {filteredClasses.map((classItem) => (
              <option value={classItem.id} key={classItem.id}>
                ({classItem.name} -{" "}
                {classItem._count.students + "/" + classItem.capacity}{" "}
                {dict.forms.capacity})
              </option>
            ))}
          </select>
          {errors.classId?.message && (
            <p className="text-xs text-red-400">
              {dict.forms.required}
            </p>
          )}
        </div>

        {type === "update" && (
          <>
            <InputField
              label={dict.forms.bringTime}
              name="bringTime"
              type="time"
              register={register}
              defaultValue={data?.bringTime ?? ""}
              error={errors.bringTime}
            />
            <InputField
              label={dict.forms.pickupTime}
              name="pickupTime"
              type="time"
              register={register}
              defaultValue={data?.pickupTime ?? ""}
              error={errors.pickupTime}
            />
          </>
        )}

        <CldUploadWidget
          uploadPreset="kita_app"
          onSuccess={(result, { widget }) => {
            setImg(result.info);
            widget.close();
          }}
        >
          {({ open }) => {
            return (
              <div
                className="text-xs text-gray-500 flex items-center gap-2 cursor-pointer"
                onClick={() => open()}
              >
                <Image src="/upload.png" alt="" width={28} height={28} />
                <span>{dict.forms.uploadPhoto}</span>
              </div>
            );
          }}
        </CldUploadWidget>
      </div>

      <div className="flex justify-end">
        {img ? (
          <CldImage
            src={img.public_id}
            width="80"
            height="80"
            alt="Uploaded image"
          />
        ) : data?.img ? (
          <Image
            src={data.img}
            width={80}
            height={80}
            alt=""
            className="rounded-md object-cover"
          />
        ) : null}
      </div>
      {state.error && (
        <span className="text-red-500">{dict.forms.somethingWentWrong}</span>
      )}
      <button type="submit" className="bg-blue-400 text-white p-2 rounded-md">
        {type === "create" ? dict.common.create : dict.common.update}
      </button>
    </form>
  );
};

export default StudentForm;
