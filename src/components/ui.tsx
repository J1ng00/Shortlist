import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Card({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-line bg-white p-6 shadow-panel", className)}>
      {children}
    </section>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary"
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-black transition",
        variant === "primary"
          ? "bg-ink text-paper shadow-soft hover:bg-navy"
          : "border border-ink/25 bg-white text-ink hover:border-ink/45 hover:bg-moss/15"
      )}
      href={href}
    >
      {children}
    </Link>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "good" | "warn" | "neutral" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-black",
        tone === "good" && "bg-clay text-navy",
        tone === "warn" && "border border-ink/20 bg-moss/25 text-navy",
        tone === "neutral" && "bg-moss/20 text-navy"
      )}
    >
      {children}
    </span>
  );
}

export function FitScore({ score }: { score: number }) {
  return (
    <div className="rounded-xl border border-ink/20 bg-ink p-5 text-paper shadow-panel">
      <p className="text-xs font-black uppercase text-paper/70">AI recommendation</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <span className="text-2xl font-black text-paper">Strong fit</span>
        <span className="text-lg font-black text-paper">{score}/100</span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-paper/25">
        <div className="h-2 rounded-full bg-clay" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
