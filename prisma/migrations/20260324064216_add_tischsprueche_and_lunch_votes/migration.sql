-- CreateTable
CREATE TABLE "Tischspruch" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tischspruch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentLunchVote" (
    "studentId" TEXT NOT NULL,
    "tischspruchId" INTEGER NOT NULL,
    "group" "LunchGroup" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentLunchVote_pkey" PRIMARY KEY ("studentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tischspruch_title_key" ON "Tischspruch"("title");

-- AddForeignKey
ALTER TABLE "StudentLunchVote" ADD CONSTRAINT "StudentLunchVote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLunchVote" ADD CONSTRAINT "StudentLunchVote_tischspruchId_fkey" FOREIGN KEY ("tischspruchId") REFERENCES "Tischspruch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
