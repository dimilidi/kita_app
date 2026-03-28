export type AttendanceRow = {
  id: string;
  name: string;
  surname: string;
  classId: number;
  className: string;
  lessonId: number | null;
  present: boolean;
  bringTime: string | null;
  defaultPickupTime: string | null;
  actualPickupTime: string | null;
  displayPickupTime: string | null;
  note: string | null;
};
