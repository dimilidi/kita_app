import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, Locale } from "@/i18n/lang";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
   title: "Kita Management Dashboard",
  description: "Next.js Kita Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieLang = cookies().get("NEXT_LANG")?.value as Locale | undefined;
  const lang = cookieLang ?? DEFAULT_LOCALE;

  return (
    <html lang={lang}>
      <body className={inter.className}>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}