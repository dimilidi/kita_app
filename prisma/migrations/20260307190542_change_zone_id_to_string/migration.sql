/*
  Warnings:

  - The primary key for the `TeacherZone` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Zone` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ZoneHistory` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_zoneId_fkey";

-- DropForeignKey
ALTER TABLE "StudentZone" DROP CONSTRAINT "StudentZone_zoneId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherZone" DROP CONSTRAINT "TeacherZone_zoneId_fkey";

-- DropForeignKey
ALTER TABLE "ZoneHistory" DROP CONSTRAINT "ZoneHistory_zoneId_fkey";

-- AlterTable
ALTER TABLE "Activity" ALTER COLUMN "zoneId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "StudentZone" ALTER COLUMN "zoneId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "TeacherZone" DROP CONSTRAINT "TeacherZone_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "zoneId" SET DATA TYPE TEXT,
ADD CONSTRAINT "TeacherZone_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "TeacherZone_id_seq";

-- AlterTable
ALTER TABLE "Zone" DROP CONSTRAINT "Zone_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Zone_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Zone_id_seq";

-- AlterTable
ALTER TABLE "ZoneHistory" DROP CONSTRAINT "ZoneHistory_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "zoneId" SET DATA TYPE TEXT,
ADD CONSTRAINT "ZoneHistory_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ZoneHistory_id_seq";

-- AddForeignKey
ALTER TABLE "StudentZone" ADD CONSTRAINT "StudentZone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherZone" ADD CONSTRAINT "TeacherZone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneHistory" ADD CONSTRAINT "ZoneHistory_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
