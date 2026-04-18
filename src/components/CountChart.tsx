"use client";

import Image from "next/image";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from "recharts";

/**
 * Donut: yellow segment (#FAE27C), blue segment (#C3EBFA) — girls/female vs boys/male.
 */
export default function CountChart({
  yellowCount,
  blueCount,
}: {
  yellowCount: number;
  blueCount: number;
}) {
  const sum = yellowCount + blueCount;
  const data = [
    {
      name: "Total",
      count: sum,
      fill: "white",
    },
    {
      name: "Yellow",
      count: yellowCount,
      fill: "#FAE27C",
    },
    {
      name: "Blue",
      count: blueCount,
      fill: "#C3EBFA",
    },
  ];

  return (
    <div className="relative w-full h-[75%]">
      <ResponsiveContainer>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="40%"
          outerRadius="100%"
          barSize={32}
          data={data}
        >
          <RadialBar background dataKey="count" />
        </RadialBarChart>
      </ResponsiveContainer>
      <Image
        src="/maleFemale.png"
        alt=""
        width={50}
        height={50}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}
