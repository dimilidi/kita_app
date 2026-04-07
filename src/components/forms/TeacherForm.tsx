"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { TeacherInput, teacherSchema, TeacherSchema } from "@/lib/formValidationSchemas";
import { createTeacherDirect, updateTeacherDirect } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CldImage, CldUploadWidget } from "next-cloudinary";
import { useTranslations } from "@/i18n/TranslationsProvider";

const TeacherForm = ({
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
  const label = dict.entities?.teacher || "teacher";
  const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

  const defaultValues = useMemo(() => {
    const birthday =
      data?.birthday && typeof data.birthday?.toISOString === "function"
        ? data.birthday.toISOString().split("T")[0]
        : typeof data?.birthday === "string"
          ? data.birthday.split("T")[0]
          : undefined;

    const zoneIds = Array.isArray(data?.zones)
      ? (data.zones.map((z: any) => z.zoneId).filter(Boolean) as string[])
      : [];

    return {
      username: data?.username ?? "",
      email: data?.email ?? "",
      password: data?.password ?? "",
      name: data?.name ?? "",
      surname: data?.surname ?? "",
      phone: data?.phone ?? "",
      address: data?.address ?? "",
      bloodType: data?.bloodType ?? "",
      birthday,
      sex: data?.sex ?? "MALE",
      id: data?.id ?? undefined,
      zoneIds,
    } as Partial<TeacherInput>;
    // Only re-create defaults when switching the edited teacher.
  }, [data?.id]);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<TeacherInput, any, TeacherSchema>({
    resolver: zodResolver(teacherSchema),
    defaultValues,
  });

  const [img, setImg] = useState<any>();
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const onSubmit = handleSubmit(async (data) => {
    const payload = { ...data, img: img?.secure_url } as any;
    try {
      setLoading(true);
      const res =
        type === "create"
          ? await createTeacherDirect(payload)
          : await updateTeacherDirect(payload);

      if (res.success) {
        const template = type === "create" ? dict.common.created : dict.common.updated;
        toast.success(template.replace("{label}", label));
        setOpen(false);
        router.refresh();
        return;
      }

      const msg = res.message || "Something went wrong";
      toast.error(msg);
      const lower = msg.toLowerCase();
      if (lower.includes("username")) {
        setError("username", { type: "server", message: msg });
      } else if (lower.includes("email")) {
        setError("email", { type: "server", message: msg });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error("Unexpected error");
    } finally {
      setLoading(false);
    }
  });

  const { zones } = relatedData as {
    zones: { id: string; name: string }[];
  };

  const selectedZoneIds = watch("zoneIds") ?? [];
  const [zoneToAdd, setZoneToAdd] = useState<string>("");

  const zoneNameById = useMemo(() => {
    return new Map(zones.map((z) => [z.id, z.name]));
  }, [zones]);

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
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label={dict.forms.username}
          name="username"
          register={register}
          error={errors?.username}
        />
        <InputField
          label={dict.forms.email}
          name="email"
          register={register}
          error={errors?.email}
        />
        <InputField
          label={dict.forms.password}
          name="password"
          type="password"
          register={register}
          error={errors?.password}
        />
      </div>
      <span className="text-xs text-gray-400 font-medium">
        {dict.forms.personalInfo}
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label={dict.forms.firstName}
          name="name"
          register={register}
          error={errors.name}
        />
        <InputField
          label={dict.forms.lastName}
          name="surname"
          register={register}
          error={errors.surname}
        />
        <InputField
          label={dict.forms.phone}
          name="phone"
          register={register}
          error={errors.phone}
        />
        <InputField
          label={dict.forms.address}
          name="address"
          register={register}
          error={errors.address}
        />
        <InputField
          label={dict.forms.bloodGroup}
          name="bloodType"
          register={register}
          error={errors.bloodType}
          hidden
        />
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{dict.forms.bloodGroup}</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("bloodType")}
          >
            <option value="">{dict.forms.none}</option>
            {BLOOD_TYPES.map((t) => (
              <option value={t} key={t}>
                {t}
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
          register={register}
          error={errors.birthday}
          type="date"
        />
        {data && (
          <InputField
            label="Id"
            name="id"
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
          <label className="text-xs text-gray-500">
            {dict.forms.playArea ??  "Play Areas"}
          </label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <select
                className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
                value={zoneToAdd}
                onChange={(e) => setZoneToAdd(e.target.value)}
              >
                <option value="">{dict.forms.none}</option>
                {zones
                  .filter((z) => !selectedZoneIds.includes(z.id))
                  .map((zone) => (
                    <option value={zone.id} key={zone.id}>
                      {zone.name}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                className="bg-kitaYellow px-3 py-2 rounded-md text-sm whitespace-nowrap"
                onClick={() => {
                  if (!zoneToAdd) return;
                  setValue("zoneIds", [...selectedZoneIds, zoneToAdd], {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  setZoneToAdd("");
                }}
              >
                {dict.common.save}
              </button>
            </div>

            {/* Selected zones */}
            {selectedZoneIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedZoneIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="text-xs bg-kitaSkyLight px-2 py-1 rounded-md break-words"
                    onClick={() => {
                      setValue(
                        "zoneIds",
                        selectedZoneIds.filter((x: string) => x !== id),
                        { shouldValidate: true, shouldDirty: true }
                      );
                    }}
                    title={dict.common.delete}
                  >
                    {zoneNameById.get(id) ?? id} ×
                  </button>
                ))}
              </div>
            )}
          </div>
          {errors.zoneIds?.message && (
            <p className="text-xs text-red-400">
              {errors.zoneIds.message.toString()}
            </p>
          )}
        </div>
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
        {img && (
        <CldImage
          src={img.public_id}
          width="80"
          height="80"
          alt="Uploaded image"
        />
        )}
      </div>
      
      <button disabled={loading} className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-60 disabled:cursor-not-allowed">
        {loading
          ? "Saving..."
          : type === "create"
          ? dict.common.create
          : dict.common.update}
      </button>
    </form>
    
  );
};

export default TeacherForm;