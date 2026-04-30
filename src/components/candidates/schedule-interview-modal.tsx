"use client";

import { FormEvent, useId, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, Loader2, X } from "lucide-react";
import { useFormStatus } from "react-dom";

type ScheduleInterviewModalProps = {
  action: (formData: FormData) => void | Promise<void>;
  candidateId: string;
  fullWidth?: boolean;
  label?: string;
  variant?: "primary" | "secondary" | "menu";
};

function ScheduleSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-paper transition hover:bg-moss disabled:cursor-wait disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
      {pending ? "Scheduling..." : "Schedule interview"}
    </button>
  );
}

export function ScheduleInterviewModal({ action, candidateId, fullWidth = false, label = "Move to next stage", variant = "primary" }: ScheduleInterviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const widthClassName = fullWidth ? "w-full" : "w-fit";
  const buttonClassName =
    variant === "menu"
      ? "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold text-ink transition hover:bg-moss/15"
      : variant === "secondary"
      ? `inline-flex ${widthClassName} items-center justify-center gap-2 rounded-full border border-ink/20 bg-paper px-4 py-2 text-sm font-bold text-ink transition hover:border-ink/40`
      : `inline-flex ${widthClassName} items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-bold text-paper transition hover:bg-moss`;

  function closeModal() {
    setIsOpen(false);
  }

  function handleSubmit(_: FormEvent<HTMLFormElement>) {
    setIsOpen(false);
  }

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-navy/45 p-4 backdrop-blur-sm">
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-md rounded-3xl border border-line bg-paper p-6 shadow-panel"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-ink">Next stage</p>
            <h2 className="mt-1 text-2xl font-black text-navy" id={titleId}>
              Schedule an interview
            </h2>
          </div>
          <button
            aria-label="Close schedule interview modal"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:border-ink/30"
            onClick={closeModal}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={action} className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input name="candidate_id" type="hidden" value={candidateId} />
          <input name="outcome" type="hidden" value="next_stage" />

          <label className="block">
            <span className="text-sm font-black text-navy">Date</span>
            <input
              className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-4 text-sm font-bold text-navy outline-none transition focus:border-ink/40"
              name="interview_date"
              required
              type="date"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-navy">Time</span>
            <input
              className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-4 text-sm font-bold text-navy outline-none transition focus:border-ink/40"
              name="interview_time"
              required
              type="time"
            />
          </label>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              className="inline-flex h-11 items-center justify-center rounded-full border border-ink/20 bg-paper px-5 text-sm font-black text-ink transition hover:border-ink/35"
              onClick={closeModal}
              type="button"
            >
              Cancel
            </button>
            <ScheduleSubmitButton />
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <button
        className={buttonClassName}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        {variant === "menu" ? <CalendarClock className="h-4 w-4" /> : null}
        {label}
      </button>

      {isOpen ? createPortal(modal, document.body) : null}
    </>
  );
}
