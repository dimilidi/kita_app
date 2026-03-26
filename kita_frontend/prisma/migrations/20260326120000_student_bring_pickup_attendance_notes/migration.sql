-- AlterTable
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "bringTime" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "pickupTime" TEXT;

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "actualPickupTime" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "note" TEXT;
