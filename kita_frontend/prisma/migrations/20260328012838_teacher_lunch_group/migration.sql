-- CreateTable
CREATE TABLE "TeacherLunchGroup" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "TeacherLunchGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherLunchGroup_teacherId_key" ON "TeacherLunchGroup"("teacherId");

-- AddForeignKey
ALTER TABLE "TeacherLunchGroup" ADD CONSTRAINT "TeacherLunchGroup_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherLunchGroup" ADD CONSTRAINT "TeacherLunchGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LunchGroupEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
