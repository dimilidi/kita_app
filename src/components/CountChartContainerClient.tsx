"use client";

import Image from "next/image";
import CountChart from "./CountChart";
import { useTranslations } from "@/i18n/TranslationsProvider";

export default function CountChartContainerClient({
  boys,
  girls,
}: {
  boys: number;
  girls: number;
}) {
  const dict = useTranslations();
  const total = boys + girls;

  const pct = (n: number) => {
    if (total <= 0) return 0;
    return Math.round((n / total) * 100);
  };

  return (
    <div className="bg-white rounded-xl w-full h-full p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">{dict.dashboard.children}</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>

      <CountChart boys={boys} girls={girls} />

      <div className="flex justify-center gap-16">
        <div className="flex flex-col gap-1">
          <div className="w-5 h-5 bg-kitaSky rounded-full" />
          <h1 className="font-bold">{boys}</h1>
          <h2 className="text-xs text-gray-300">
            {dict.dashboard.boys} ({pct(boys)}%)
          </h2>
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-5 h-5 bg-kitaYellow rounded-full" />
          <h1 className="font-bold">{girls}</h1>
          <h2 className="text-xs text-gray-300">
            {dict.dashboard.girls} ({pct(girls)}%)
          </h2>
        </div>
      </div>
    </div>
  );
}

