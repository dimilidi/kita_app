-- DropIndex
DROP INDEX "Lesson_zoneId_idx";

-- AlterTable
ALTER TABLE "StudentLunchGroup" ADD COLUMN     "groupId" TEXT,
ALTER COLUMN "group" DROP NOT NULL;

-- AlterTable
ALTER TABLE "StudentLunchVote" ADD COLUMN     "groupId" TEXT,
ALTER COLUMN "group" DROP NOT NULL;

-- CreateTable
CREATE TABLE "LunchGroupEntity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "capacity" INTEGER DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LunchGroupEntity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LunchGroupEntity_name_key" ON "LunchGroupEntity"("name");

-- AddForeignKey
ALTER TABLE "StudentLunchGroup" ADD CONSTRAINT "StudentLunchGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LunchGroupEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLunchVote" ADD CONSTRAINT "StudentLunchVote_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LunchGroupEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
