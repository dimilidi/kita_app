import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import GroupChatClient from "@/components/chat/GroupChatClient";
import { fetchStaffChatMessagesPayload } from "@/lib/chatMessages";
import { canAccessStaffChat } from "@/lib/chatPermissions";
import { getDictionary } from "@/i18n/getDictionary";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/lang";
import { getAuthData } from "@/lib/utils";

function getLocale(): Locale {
  const v = cookies().get("NEXT_LANG")?.value;
  return v === "en" || v === "de" ? v : DEFAULT_LOCALE;
}

export default async function MessagesPage() {
  const { userId, role } = getAuthData();

  const locale = getLocale();
  if (!userId) {
    redirect(`/${locale}/sign-in`);
  }
  if (!canAccessStaffChat(role)) {
    const fallbackRole =
      role === "student" ||
      role === "parent" ||
      role === "teacher" ||
      role === "admin"
        ? role
        : "student";
    redirect(`/${locale}/${fallbackRole}`);
  }

  const dict = getDictionary(locale) as {
    staffChat: { pageTitle: string; subtitle: string };
  };
  const chat = dict.staffChat;

  const initial = await fetchStaffChatMessagesPayload(userId);

  return (
    <div className="flex flex-col gap-3 p-4 lg:gap-4">
      <header>
        <h1 className="text-xl font-semibold">{chat.pageTitle}</h1>
        <p className="text-sm text-gray-500">{chat.subtitle}</p>
      </header>

      <div className="flex min-h-[calc(100vh-220px)] flex-1 flex-col lg:min-h-[calc(100vh-180px)]">
        <GroupChatClient
          initialMessages={initial.messages}
          currentUserId={userId}
        />
      </div>
    </div>
  );
}
