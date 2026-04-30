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
      ? `inline-flex ${widthClassName} items-center justify-center gap-2 rounded-full border border-ink/25 bg-paper px-4 py-2 text-sm font-black text-ink transition hover:border-ink/45 hover:bg-clay/55 disabled:cursor-wait disabled:opacity-60`
      : variant === "danger"
        ? `inline-flex ${widthClassName} items-center justify-center gap-2 rounded-full border border-red-300 bg-red-50 px-4 py-2 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60`
        : `inline-flex ${widthClassName} items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-black text-paper shadow-panel transition hover:bg-navy disabled:cursor-wait disabled:opacity-60`;

  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
