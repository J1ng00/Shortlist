"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCandidateUpload } from "@/lib/supabase/client/create-candidate-upload";

type Props = {
  jobId: string;
};

export function CandidateUploadForm({ jobId }: Props) {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [manualProfileNotes, setManualProfileNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Please upload a resume PDF.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const candidateId = await createCandidateUpload({
        jobId,
        file,
        githubUrl,
        linkedinUrl,
        manualProfileNotes,
      });

      router.push(`/candidates/${candidateId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-bold text-ink">Resume PDF</label>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-ink">GitHub URL</label>
        <input
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          className="block w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm"
          placeholder="Optional"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-ink">LinkedIn URL</label>
        <input
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          className="block w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm"
          placeholder="Optional"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-ink">Manual profile notes</label>
        <textarea
          value={manualProfileNotes}
          onChange={(e) => setManualProfileNotes(e.target.value)}
          className="block min-h-28 w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm"
          placeholder="Optional notes about the candidate"
        />
      </div>

      {error ? (
        <p className="text-sm text-ink/70">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-2xl bg-ink px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {isSubmitting ? "Processing candidate..." : "Upload candidate"}
      </button>
    </form>
  );
}
