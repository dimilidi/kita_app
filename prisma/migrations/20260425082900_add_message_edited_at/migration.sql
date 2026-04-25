-- Add editedAt marker for staff chat messages
ALTER TABLE "Message" ADD COLUMN "editedAt" TIMESTAMP(3);

-- Optional index to filter/sort by edited messages (cheap)
CREATE INDEX IF NOT EXISTS "Message_editedAt_idx" ON "Message"("editedAt");
