/*
  Warnings:

  - The primary key for the `PlayZone` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `PlayZone` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `PlayZone` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PlayZone" DROP CONSTRAINT "PlayZone_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "id",
ADD COLUMN     "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD CONSTRAINT "PlayZone_pkey" PRIMARY KEY ("studentId");

-- CreateTable
CREATE TABLE "ZoneHistory" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZoneHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ZoneHistory" ADD CONSTRAINT "ZoneHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
