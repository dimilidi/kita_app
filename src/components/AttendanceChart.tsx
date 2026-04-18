"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTranslations } from "@/i18n/TranslationsProvider";

const AttendanceChart = ({
  data,
}: {
  data: { name: string; present: number; absent: number }[];
}) => {
  const dict = useTranslations();

  const seriesLabel = (key: string) => {
    if (key === "present") return dict.dashboard.present;
    if (key === "absent") return dict.dashboard.absent;
    return key;
  };

  return (
    <div className="h-full w-full min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart width={500} height={300} data={data} barSize={20}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#ddd"
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tick={{ fill: "#d1d5db" }}
            tickLine={false}
          />
          <YAxis axisLine={false} tick={{ fill: "#d1d5db" }} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }}
            formatter={(value, name) => {
              const key = String(name);
              return [value, seriesLabel(key)];
            }}
          />
          <Legend
            align="left"
            verticalAlign="top"
            wrapperStyle={{ paddingTop: "20px", paddingBottom: "40px" }}
            formatter={(value) => seriesLabel(String(value))}
          />
          <Bar
            dataKey="present"
            fill="#FAE27C"
            legendType="circle"
            radius={[10, 10, 0, 0]}
          />
          <Bar
            dataKey="absent"
            fill="#C3EBFA"
            legendType="circle"
            radius={[10, 10, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AttendanceChart;