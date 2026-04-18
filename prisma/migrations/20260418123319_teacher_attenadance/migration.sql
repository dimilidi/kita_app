-- CreateTable
CREATE TABLE "TeacherAttendance" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "present" BOOLEAN NOT NULL,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "TeacherAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAttendance_teacherId_date_key" ON "TeacherAttendance"("teacherId", "date");

-- AddForeignKey
ALTER TABLE "TeacherAttendance" ADD CONSTRAINT "TeacherAttendance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
