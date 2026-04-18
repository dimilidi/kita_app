import prisma from "@/lib/prisma";
import CountChartContainerClient from "./CountChartContainerClient";

const CountChartContainer = async () => {
  const [studentSex, teacherSex] = await Promise.all([
    prisma.student.groupBy({
      by: ["sex"],
      _count: true,
    }),
    prisma.teacher.groupBy({
      by: ["sex"],
      _count: true,
    }),
  ]);

  const boys = studentSex.find((d) => d.sex === "MALE")?._count || 0;
  const girls = studentSex.find((d) => d.sex === "FEMALE")?._count || 0;

  const educatorMale = teacherSex.find((d) => d.sex === "MALE")?._count || 0;
  const educatorFemale =
    teacherSex.find((d) => d.sex === "FEMALE")?._count || 0;
  const canShowEducators = educatorMale + educatorFemale > 0;

  return (
    <CountChartContainerClient
      boys={boys}
      girls={girls}
      educatorMale={educatorMale}
      educatorFemale={educatorFemale}
      canShowEducators={canShowEducators}
    />
  );
};

export default CountChartContainer;