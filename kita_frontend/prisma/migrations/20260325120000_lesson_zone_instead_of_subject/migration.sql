-- Lesson: replace subjectId (Subject) with zoneId (Zone) for Kita activities.

-- 1) Add nullable zoneId
ALTER TABLE "Lesson" ADD COLUMN "zoneId" TEXT;

-- 2) Backfill: match Subject name to Zone name (case-insensitive)
UPDATE "Lesson" l
SET "zoneId" = z.id
FROM "Subject" s
INNER JOIN "Zone" z ON LOWER(TRIM(s."name")) = LOWER(TRIM(z."name"))
WHERE l."subjectId" = s.id;

-- 3) Ensure at least one Zone exists for any remaining rows
INSERT INTO "Zone" ("id", "name")
SELECT 'clessonsmigrationdefault000000000', 'Default play area'
WHERE NOT EXISTS (SELECT 1 FROM "Zone" LIMIT 1);

-- 4) Assign any lesson still missing zoneId to first zone (by name)
UPDATE "Lesson"
SET "zoneId" = (SELECT "id" FROM "Zone" ORDER BY "name" ASC LIMIT 1)
WHERE "zoneId" IS NULL;

-- 5) Require zoneId
ALTER TABLE "Lesson" ALTER COLUMN "zoneId" SET NOT NULL;

-- 6) Drop old Subject FK and column
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_subjectId_fkey";
ALTER TABLE "Lesson" DROP COLUMN "subjectId";

-- 7) Link Lesson to Zone
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Lesson_zoneId_idx" ON "Lesson"("zoneId");
