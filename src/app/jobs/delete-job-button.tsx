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
      aria-label={`Delete ${roleTitle}`}
      className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isDeleting}
      onClick={confirmDelete}
      title="Delete"
      type="button"
    >
      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
}
