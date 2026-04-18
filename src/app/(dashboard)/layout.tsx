import Menu from "@/components/Menu";
import NavbarServer from "@/components/NavbarServer";
import Image from "next/image";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen flex print:h-auto print:min-h-0 print:block">
      {/* LEFT */}
      <div className="w-[14%] md:w-[8%] lg:w-[16%] xl:w-[14%] p-4 print:hidden">
        <Link
          href="/"
          className="flex items-center justify-center lg:justify-start gap-2"
        >
          <Image src="/logo.jpg" alt="logo" width={42} height={42} />
          <span className="hidden lg:block font-bold">KitaKarlstraße</span>
        </Link>
        <Menu />
      </div>
      {/* RIGHT */}
      <div className="w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%] bg-[#F7F8FA] overflow-scroll flex flex-col print:w-full print:max-w-none print:overflow-visible print:h-auto print:min-h-0 print:block">
        <div className="print:hidden">
          <NavbarServer />
        </div>
        <div className="flex-1 min-h-0 overflow-auto print:flex-none print:overflow-visible print:min-h-0 print:h-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
