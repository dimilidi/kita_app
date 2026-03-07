-- CreateTable
CREATE TABLE "PlayZone" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayZone_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PlayZone" ADD CONSTRAINT "PlayZone_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
