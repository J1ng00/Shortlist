"use client";

import { Trash2 } from "lucide-react";
import { useRef } from "react";

import { deleteJob } from "./new/actions";

export function DeleteJobButton({ jobId, roleTitle }: { jobId: string; roleTitle: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  function confirmDelete() {
    const confirmed = window.confirm(`Delete "${roleTitle}"? This will remove the saved job profile.`);

    if (confirmed) {
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form ref={formRef} action={deleteJob}>
      <input type="hidden" name="job_id" value={jobId} />
      <button
        className="inline-flex items-center justify-center gap-2 rounded-full border border-clay/30 bg-paper px-4 py-2 text-sm font-bold text-clay transition hover:border-clay/60 hover:bg-clay/10"
        type="button"
        onClick={confirmDelete}
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    </form>
  );
}
