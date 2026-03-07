import prisma from "@/lib/prisma";
import PlayBoard from "./PlayBoard";
import { Prisma } from "@prisma/client";

type StudentWithClass = Prisma.StudentGetPayload<{
  include: { class: true };
}>;

export default async function PlayPage() {
  const students: StudentWithClass[] = await prisma.student.findMany({
    include: {
      class: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const zones = await prisma.zone.findMany();

  const studentZones = await prisma.studentZone.findMany();

  const initialZones: Record<string, string[]> = {};

  zones.forEach((z) => {
    initialZones[z.id] = [];
  });

  initialZones["pool"] = [];

  studentZones.forEach((sz) => {
    initialZones[sz.zoneId]?.push(sz.studentId);
  });

  const placedStudents = new Set(studentZones.map((z) => z.studentId));

  students.forEach((s) => {
    if (!placedStudents.has(s.id)) {
      initialZones.pool.push(s.id);
    }
  });

  return (
    <div className="p-4">
      <PlayBoard
        students={students}
        zones={zones}
        initialZones={initialZones}
      />
    </div>
  );
}