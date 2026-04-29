import Image from "next/image";
import Link from "next/link";

import shortlistLogo from "@/components/SHORTLIST.png";

type BrandProps = {
  compact?: boolean;
};

export function Brand({ compact = false }: BrandProps) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
        <Image
          alt="Shortlist"
          className="h-full w-full object-cover"
          height={40}
          priority
          src={shortlistLogo}
          width={40}
        />
      </span>
      {compact ? null : (
        <span className="min-w-0">
          <span className="block truncate text-xl font-black leading-none text-ink">Shortlist</span>
          <span className="mt-1 block text-xs font-bold uppercase text-navy/50">AI HR Partner</span>
        </span>
      )}
    </Link>
  );
}
