import Image from "next/image";

export default function SortIcon({ className }: { className?: string }) {
  return <Image src="/sort.png" alt="" width={14} height={14} className={className} />;
}
