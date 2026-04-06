"use client";

import Child from "@/components/Child";
import EducatorCard from "@/components/EducatorCard";
import type { TeacherLite } from "@/components/PlayAreaCard";
import { StudentWithClass } from "@/types/student";
import { useTranslations } from "@/i18n/TranslationsProvider";

type Props = {
  title: string;
  childrenIds: string[];
  educatorIds: string[];
  getStudent: (id: string) => StudentWithClass | undefined;
  getTeacher: (id: string) => TeacherLite | undefined;
  onClose: () => void;
};

export default function ZonePanel({
  title,
  childrenIds,
  educatorIds,
  getStudent,
  getTeacher,
  onClose,
}: Props) {
  const dict = useTranslations();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

      <div className="bg-white w-[900px] rounded-xl shadow-xl p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1 bg-gray-100 rounded"
          >
            {dict.common.close}
          </button>
        </div>

        {/* EDUCATORS */}
        <div>
          <h3 className="font-semibold mb-2">
            {dict.zones.educators} ({educatorIds.length})
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-3">
            {educatorIds.map((id) => {
              const teacher = getTeacher(id);
              if (!teacher) return null;
              return (
                <EducatorCard
                  key={id}
                  id={teacher.id}
                  name={`${teacher.name} ${teacher.surname}`}
                  img={teacher.img}
                  readOnly
                />
              );
            })}
          </div>
        </div>

        {/* ACTIVITIES */}
        <div>
          <h3 className="font-semibold mb-2">{dict.zones.activities}</h3>
          <ul className="list-disc ml-6 text-sm">
            <li>{dict.zones.sampleActivities.blocks}</li>
            <li>{dict.zones.sampleActivities.puzzles}</li>
            <li>{dict.zones.sampleActivities.creative}</li>
          </ul>
        </div>

        {/* CHILDREN */}
        <div>
          <h3 className="font-semibold mb-3">
            {dict.zones.children} ({childrenIds.length})
          </h3>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-3">
            {childrenIds.map((id) => {
              const student = getStudent(id);
              if (!student) return null;

              return (
                <Child
                  key={id}
                  id={student.id}
                  name={`${student.name} ${student.surname}`}
                  img={student.img ?? undefined}
                  group={student.class.name}
                />
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}