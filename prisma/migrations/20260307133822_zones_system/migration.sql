/*
  Warnings:

  - You are about to drop the column `zone` on the `ZoneHistory` table. All the data in the column will be lost.
  - You are about to drop the `PlayZone` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `zoneId` to the `ZoneHistory` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PlayZone" DROP CONSTRAINT "PlayZone_studentId_fkey";

-- AlterTable
ALTER TABLE "ZoneHistory" DROP COLUMN "zone",
ADD COLUMN     "zoneId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "PlayZone";

-- CreateTable
CREATE TABLE "Zone" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "description" TEXT,
    "color" TEXT,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentZone" (
    "studentId" TEXT NOT NULL,
    "zoneId" INTEGER NOT NULL,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentZone_pkey" PRIMARY KEY ("studentId")
);

-- CreateTable
CREATE TABLE "TeacherZone" (
    "id" SERIAL NOT NULL,
    "teacherId" TEXT NOT NULL,
    "zoneId" INTEGER NOT NULL,

    CONSTRAINT "TeacherZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "zoneId" INTEGER NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Zone_name_key" ON "Zone"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherZone_teacherId_zoneId_key" ON "TeacherZone"("teacherId", "zoneId");

-- AddForeignKey
ALTER TABLE "StudentZone" ADD CONSTRAINT "StudentZone_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentZone" ADD CONSTRAINT "StudentZone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherZone" ADD CONSTRAINT "TeacherZone_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherZone" ADD CONSTRAINT "TeacherZone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneHistory" ADD CONSTRAINT "ZoneHistory_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
