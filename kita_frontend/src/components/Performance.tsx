// "use client";

// import Image from "next/image";
// import {
//   PieChart,
//   Pie,
//   Cell,
//   ResponsiveContainer,
//   Tooltip,
//   Legend,
// } from "recharts";
// import { useTranslations } from "@/i18n/TranslationsProvider";

// const COLORS = ["#C3EBFA", "#FAE27C", "#C7D2FE", "#FBCFE8", "#BBF7D0", "#FDE68A", "#A5F3FC"];

// export type FavouriteActivitySlice = {
//   name: string;
//   /** Value used for slice size (time spent in ms, or fallback visit count) */
//   value: number;
// };

// type PerformanceProps = {
//   activities: FavouriteActivitySlice[];
// };

// /**
//  * Pie chart of how the child spends time across play areas (zones).
//  */
// const Performance = ({ activities }: PerformanceProps) => {
//   const dict = useTranslations();
//   const d = dict.dashboard as Record<string, string> | undefined;

//   const data = activities.map((a, i) => ({
//     ...a,
//     fill: COLORS[i % COLORS.length],
//   }));

//   const total = data.reduce((s, x) => s + x.value, 0);
//   const hasData = total > 0;

//   return (
//     <div className="bg-white p-4 rounded-md h-80 relative">
//       <div className="flex items-center justify-between">
//         <h1 className="text-xl font-semibold">
//           {d?.timeByPlayArea ?? "Time by Play Area"}
//         </h1>
//         <Image src="/moreDark.png" alt="" width={16} height={16} />
//       </div>

//       {!hasData ? (
//         <div className="flex h-[calc(100%-2.5rem)] items-center justify-center text-sm text-gray-500 px-4 text-center">
//           {d?.noAreaData ?? "No area data"}
//         </div>
//       ) : (
//         <div className="h-[calc(100%-2.5rem)] min-h-0 w-full pt-2">
//           <ResponsiveContainer width="100%" height="100%">
//             <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
//               <Tooltip
//                 formatter={(value: number, name: string) => {
//                   const pct =
//                     total > 0 ? Math.round((Number(value) / total) * 100) : 0;
//                   return [`${pct}%`, name];
//                 }}
//               />
//               <Pie
//                 dataKey="value"
//                 nameKey="name"
//                 data={data}
//                 cx="50%"
//                 cy="46%"
//                 innerRadius={48}
//                 outerRadius={76}
//                 paddingAngle={2}
//               >
//                 {data.map((entry, index) => (
//                   <Cell key={`cell-${index}`} fill={entry.fill} />
//                 ))}
//               </Pie>
//               <Legend
//                 verticalAlign="bottom"
//                 layout="horizontal"
//                 align="center"
//                 iconType="circle"
//                 iconSize={8}
//                 wrapperStyle={{
//                   fontSize: "11px",
//                   lineHeight: "1.35",
//                   paddingTop: "4px",
//                   width: "100%",
//                 }}
//                 formatter={(value: string) => (
//                   <span className="text-gray-700">{value}</span>
//                 )}
//               />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Performance;


"use client";

import Image from "next/image";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useTranslations } from "@/i18n/TranslationsProvider";

const COLORS = [
  "#C3EBFA",
  "#FAE27C",
  "#C7D2FE",
  "#FBCFE8",
  "#BBF7D0",
  "#FDE68A",
  "#A5F3FC",
];

export type FavouriteActivitySlice = {
  name: string;
  value: number;
};

type PerformanceProps = {
  activities?: FavouriteActivitySlice[]; // ✅ optional now
  title?: string; // ✅ optional title
  emptyText?: string;
  hideTitleWhenEmpty?: boolean;
};

const Performance = ({
  activities = [],
  title,
  emptyText,
  hideTitleWhenEmpty = false,
}: PerformanceProps) => {
  const dict = useTranslations();
  const d = dict.dashboard as Record<string, string> | undefined;

  const data = activities.map((a, i) => ({
    ...a,
    fill: COLORS[i % COLORS.length],
  }));

  const total = data.reduce((s, x) => s + x.value, 0);
  const hasData = total > 0;

  return (
    <div className="bg-white p-4 rounded-md h-80 relative">
      {!(hideTitleWhenEmpty && !hasData) && (
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            {title ?? d?.timeByPlayArea ?? "Time by Play Area"}
          </h1>
          <Image src="/moreDark.png" alt="" width={16} height={16} />
        </div>
      )}

      {!hasData ? (
        <div className="flex h-[calc(100%-2.5rem)] items-center justify-center text-sm text-gray-500 px-4 text-center">
          {emptyText ?? d?.noAreaData ?? "No area data"}
        </div>
      ) : (
        <div className="h-[calc(100%-2.5rem)] min-h-0 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <Tooltip
                formatter={(value: number, name: string) => {
                  const pct =
                    total > 0
                      ? Math.round((Number(value) / total) * 100)
                      : 0;
                  return [`${pct}%`, name];
                }}
              />
              <Pie
                dataKey="value"
                nameKey="name"
                data={data}
                cx="50%"
                cy="46%"
                innerRadius={48}
                outerRadius={76}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                layout="horizontal"
                align="center"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{
                  fontSize: "11px",
                  lineHeight: "1.35",
                  paddingTop: "4px",
                  width: "100%",
                }}
                formatter={(value: string) => (
                  <span className="text-gray-700">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default Performance;