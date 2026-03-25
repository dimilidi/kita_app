-- CreateEnum
CREATE TYPE "LunchGroup" AS ENUM ('green', 'yellow', 'red');

-- CreateTable
CREATE TABLE "StudentLunchGroup" (
    "studentId" TEXT NOT NULL,
    "group" "LunchGroup" NOT NULL,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentLunchGroup_pkey" PRIMARY KEY ("studentId")
);

-- AddForeignKey
ALTER TABLE "StudentLunchGroup" ADD CONSTRAINT "StudentLunchGroup_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
