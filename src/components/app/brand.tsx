import Image from "next/image";
import Link from "next/link";

import shortlistLogo from "@/components/SHORTLIST.png";

type BrandProps = {
  compact?: boolean;
};

export function Brand({ compact = false }: BrandProps) {
  return (
    <Link href="/" className="group flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-paper shadow-panel transition duration-200 group-hover:scale-105">
        <Image
          alt="Shortlist"
          className="h-full w-full object-contain"
          height={40}
          priority
          src={shortlistLogo}
          width={40}
        />
      </span>
      {compact ? null : (
        <span className="min-w-0">
          <span className="block truncate text-xl font-black uppercase leading-none text-current">Shortlist</span>
          <span className="mt-1 block text-xs font-bold uppercase text-current/60">AI HR Partner</span>
        </span>
      )}
    </Link>
  );
}
