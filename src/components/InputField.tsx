"use client";

import { useTranslations } from "@/i18n/TranslationsProvider";

type InputFieldProps = {
  label: string;
  type?: string;
  register: any;
  name: string;
  defaultValue?: string;
  error?: any;
  hidden?: boolean;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
};

const InputField = ({
  label,
  type = "text",
  register,
  name,
  defaultValue,
  error,
  hidden,
  inputProps,
}: InputFieldProps) => {
  const dict = useTranslations();

  const getErrorText = () => {
    const msg = error?.message?.toString?.() as string | undefined;
    if (!msg) return null;

    // If schema provides translation keys (e.g. "forms.required"), map them.
    if (msg.startsWith("forms.")) {
      const key = msg.replace("forms.", "");
      return (dict.forms?.[key] as string | undefined) ?? msg;
    }

    return msg;
  };

  const errorText = getErrorText();

  return (
    <div className={hidden ? "hidden" : "flex flex-col gap-2 w-full md:w-1/4"}>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type}
        {...register(name)}
        className={`ring-[1.5px] p-2 rounded-md text-sm w-full outline-none ${
          errorText ? "ring-red-400" : "ring-gray-300"
        }`}
        {...inputProps}
        defaultValue={defaultValue}
      />
      {errorText && <p className="text-xs text-red-400">{errorText}</p>}
    </div>
  );
};

export default InputField;