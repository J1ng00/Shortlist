import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  inverted = false,
  size = "md"
}: {
  className?: string;
  inverted?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClassName = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-10 w-10";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl",
        inverted ? "bg-paper text-ink" : "bg-ink text-paper",
        sizeClassName,
        className
      )}
      aria-hidden="true"
    >
      <svg className="h-[78%] w-[78%]" viewBox="0 0 64 64" fill="none">
        <path
          d="M7 19.5C7 15.9 9.9 13 13.5 13h13.1c2 0 3.9.9 5.1 2.5l2.3 3h16.5c3.6 0 6.5 2.9 6.5 6.5v20.5c0 3.6-2.9 6.5-6.5 6.5h-37C9.9 52 7 49.1 7 45.5v-26Z"
          fill="currentColor"
        />
        <path
          d="M15 28h32"
          stroke={inverted ? "#3C578F" : "#FDFDF5"}
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M42 34H24l17 10H22"
          stroke={inverted ? "#3C578F" : "#FDFDF5"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="7"
        />
      </svg>
    </span>
  );
}

export function Card({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-line bg-paper p-6 shadow-panel", className)}>
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
          : "border border-ink/25 bg-paper text-ink hover:border-ink/45 hover:bg-moss/15"
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
        tone === "good" && "border border-ink/10 bg-clay/70 text-navy",
        tone === "warn" && "border border-ink/20 bg-moss/25 text-navy",
        tone === "neutral" && "border border-line bg-moss/15 text-navy"
      )}
    >
      {children}
    </span>
  );
}

export function FitScore({ score }: { score: number }) {
  return (
    <div className="rounded-xl border border-ink/30 bg-ink p-5 text-paper shadow-panel">
      <p className="text-xs font-black uppercase text-paper/70">AI recommendation</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <span className="text-2xl font-black text-paper">Strong fit</span>
        <span className="text-lg font-black text-paper">{score}/100</span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-paper/20">
        <div className="h-2 rounded-full bg-moss" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
