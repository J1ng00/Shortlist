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
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPosition, setCurrentPosition] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
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
        fullName,
        email,
        phone,
        currentPosition,
        githubUrl,
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
        <label className="mb-2 block text-sm font-bold text-ink">Full name</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="block w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm"
          placeholder="Optional before parsing"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="block w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm"
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-ink">Current position</label>
        <input
          value={currentPosition}
          onChange={(e) => setCurrentPosition(e.target.value)}
          className="block w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm"
          placeholder="Optional"
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
