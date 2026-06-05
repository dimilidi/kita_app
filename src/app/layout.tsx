import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, Locale } from "@/i18n/lang";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
  console.log(
    "Cloudinary:",
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  );
  
  return (
    <html lang={lang}>
      <body className={inter.className}>
        <ClerkProvider>
          {children}
          <ToastContainer position="top-right" autoClose={3000} />
        </ClerkProvider>
      </body>
    </html>
  );
}