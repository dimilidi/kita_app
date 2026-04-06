import prisma from "@/lib/prisma";
import CountChartContainerClient from "./CountChartContainerClient";

const CountChartContainer = async () => {
  const data = await prisma.student.groupBy({
    by: ["sex"],
    _count: true,
  });

  const boys = data.find((d) => d.sex === "MALE")?._count || 0;
  const girls = data.find((d) => d.sex === "FEMALE")?._count || 0;

  return <CountChartContainerClient boys={boys} girls={girls} />;
};

export default CountChartContainer;