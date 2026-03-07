"use client";

import Child from "@/components/Child";
import { StudentWithClass } from "@/types/student";

type Props = {
  zoneId: string;
  title: string;
  childrenIds: string[];
  getStudent: (id: string) => StudentWithClass | undefined;
  onClose: () => void;
};

export default function ZonePanel({
  zoneId,
  title,
  childrenIds,
  getStudent,
  onClose,
}: Props) {
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
            Close
          </button>
        </div>

        {/* TEACHERS */}
        <div>
          <h3 className="font-semibold mb-2">Teachers</h3>
          <div className="flex gap-3">
            <div className="px-3 py-1 bg-gray-100 rounded">Anna</div>
            <div className="px-3 py-1 bg-gray-100 rounded">Maria</div>
          </div>
        </div>

        {/* ACTIVITIES */}
        <div>
          <h3 className="font-semibold mb-2">Activities</h3>
          <ul className="list-disc ml-6 text-sm">
            <li>Building blocks</li>
            <li>Puzzle corner</li>
            <li>Creative play</li>
          </ul>
        </div>

        {/* CHILDREN */}
        <div>
          <h3 className="font-semibold mb-3">
            Children ({childrenIds.length})
          </h3>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-3">
            {childrenIds.map((id) => {
              const student = getStudent(id);
              if (!student) return null;

              return (
                <Child
                  key={id}
                  id={student.id}
                  name={student.name}
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