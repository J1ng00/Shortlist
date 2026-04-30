import Link from "next/link";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function Card({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "animate-shortlist-in rounded-2xl border border-ink/20 bg-paper/95 p-6 shadow-panel transition duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-strong",
        className
      )}
    >
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
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black transition duration-200 motion-safe:hover:-translate-y-0.5",
        variant === "primary"
          ? "bg-ink text-paper shadow-soft hover:bg-navy hover:shadow-panel"
          : "border border-ink/25 bg-paper text-ink hover:border-ink/45 hover:bg-clay/55"
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
        tone === "good" && "border border-ink/20 bg-clay text-navy",
        tone === "warn" && "border border-ink/20 bg-moss/25 text-ink",
        tone === "neutral" && "border border-ink/15 bg-white text-ink"
      )}
    >
      {children}
    </span>
  );
}

export function LoadingPanel({
  children,
  className,
  title
}: {
  children?: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink/20 bg-paper/95 p-5 text-center shadow-strong backdrop-blur-sm",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="mx-auto h-6 w-6 animate-spin text-ink" />
      <p className="mt-3 text-sm font-black text-navy">{title}</p>
      {children ? <p className="mt-2 text-sm leading-6 text-navy/60">{children}</p> : null}
    </div>
  );
}

export function FitScore({ score }: { score: number }) {
  return (
    <div className="shortlist-surface animate-shortlist-in rounded-2xl border border-paper/20 bg-ink p-5 text-paper shadow-strong">
      <p className="text-sm font-semibold text-paper/70">AI fit score</p>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-5xl font-black">{score}</span>
        <span className="pb-2 text-paper/60">/100</span>
      </div>
      <div className="mt-5 h-2 rounded-full bg-paper/20">
        <div className="animate-shortlist-progress h-2 rounded-full bg-clay" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
