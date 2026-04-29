"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteJob } from "./new/actions";

export function DeleteJobButton({ jobId, roleTitle }: { jobId: string; roleTitle: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmDelete() {
    const confirmed = window.confirm(`Delete "${roleTitle}"? This will remove the saved job profile.`);

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const formData = new FormData();
      formData.set("job_id", jobId);
      await deleteJob(formData);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      className="inline-flex items-center justify-center gap-2 rounded-full border border-clay/30 bg-paper px-4 py-2 text-sm font-bold text-clay transition hover:border-clay/60 hover:bg-clay/10 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isDeleting}
      type="button"
      onClick={confirmDelete}
    >
      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
}
