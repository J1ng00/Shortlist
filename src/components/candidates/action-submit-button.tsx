"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

type ActionSubmitButtonProps = {
  children: ReactNode;
  pendingLabel: string;
  fullWidth?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

export function ActionSubmitButton({ children, fullWidth = false, pendingLabel, variant = "primary" }: ActionSubmitButtonProps) {
  const { pending } = useFormStatus();
  const widthClassName = fullWidth ? "w-full" : "w-fit";
  const className =
    variant === "secondary"
      ? `inline-flex ${widthClassName} items-center justify-center gap-2 rounded-full border border-ink/20 bg-paper px-4 py-2 text-sm font-bold text-ink transition hover:border-ink/40 disabled:cursor-wait disabled:opacity-60`
      : variant === "danger"
        ? `inline-flex ${widthClassName} items-center justify-center gap-2 rounded-full border border-clay/40 bg-clay/25 px-4 py-2 text-sm font-bold text-ink transition hover:bg-clay/40 disabled:cursor-wait disabled:opacity-60`
        : `inline-flex ${widthClassName} items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-bold text-paper transition hover:bg-moss disabled:cursor-wait disabled:opacity-60`;

  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
