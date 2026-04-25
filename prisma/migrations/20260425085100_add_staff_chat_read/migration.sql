-- Tracks when a staff chat user last opened Messages.
CREATE TABLE "StaffChatRead" (
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffChatRead_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX "StaffChatRead_lastReadAt_idx" ON "StaffChatRead"("lastReadAt");
