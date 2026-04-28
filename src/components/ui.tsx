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
    <section className={cn("rounded-3xl border border-ink/10 bg-paper p-6 shadow-soft", className)}>
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
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition",
        variant === "primary"
          ? "bg-ink text-paper hover:bg-moss"
          : "border border-ink/20 bg-paper text-ink hover:border-ink/30"
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
        "inline-flex rounded-full px-3 py-1 text-xs font-bold",
        tone === "good" && "bg-moss/10 text-moss",
        tone === "warn" && "bg-clay/20 text-clay",
        tone === "neutral" && "bg-ink/10 text-ink/70"
      )}
    >
      {children}
    </span>
  );
}

export function FitScore({ score }: { score: number }) {
  return (
    <div className="rounded-3xl bg-ink p-5 text-paper">
      <p className="text-sm font-semibold text-paper/70">AI fit score</p>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-5xl font-black tracking-tight">{score}</span>
        <span className="pb-2 text-paper/60">/100</span>
      </div>
      <div className="mt-5 h-2 rounded-full bg-paper/20">
        <div className="h-2 rounded-full bg-clay" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
