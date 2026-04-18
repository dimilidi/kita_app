import Image from "next/image";

export default function FilterIcon({ className }: { className?: string }) {
  return (
    <Image src="/filter.png" alt="" width={14} height={14} className={className} />
  );
}
