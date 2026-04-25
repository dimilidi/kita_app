import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { fetchStaffChatMessagesPayload } from "@/lib/chatMessages";
import { canAccessStaffChat } from "@/lib/chatPermissions";

export async function GET() {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (sessionClaims?.metadata as { role?: string })?.role ?? null;
  if (!canAccessStaffChat(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await fetchStaffChatMessagesPayload(userId);
  return NextResponse.json(payload);
}
