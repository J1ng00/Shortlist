"use client";

import { useState } from "react";

type Props = {
  jobId: string;
  jobTitle?: string;
  businessName?: string;
};

export function CandidateUploadForm({ jobId, jobTitle, businessName }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [manualProfileNotes, setManualProfileNotes] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPosition, setCurrentPosition] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Please upload a resume PDF.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const formData = new FormData();
      formData.set("job_id", jobId);
      formData.set("full_name", fullName);
      formData.set("current_position", currentPosition);
      formData.set("email", email);
      formData.set("phone", phone);
      formData.set("github_url", githubUrl);
      formData.set("linkedin_url", linkedinUrl);
      formData.set("manual_profile_notes", manualProfileNotes);
      formData.set("resume", file);

      const response = await fetch("/api/candidate-applications", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to upload candidate details.");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white px-5 py-6">
        <p className="text-sm font-black uppercase text-ink">Application submitted</p>
        <h2 className="mt-2 text-2xl font-black text-navy">Thank you</h2>
        <p className="mt-3 text-sm leading-6 text-navy/70">
          Your resume and profile details have been received. The hiring team will review your application.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {jobTitle || businessName ? (
        <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
          <p className="text-xs font-black uppercase text-ink/60">Applying for</p>
          <p className="mt-1 text-sm font-bold text-navy">
            {[jobTitle, businessName].filter(Boolean).join(" at ")}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold text-ink">Candidate name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="block w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm"
            placeholder="Your full name"
            required
          />
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
          <label className="mb-2 block text-sm font-bold text-ink">Email</label>
          <input
            type="email"
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
        <label className="mb-2 block text-sm font-bold text-ink">Resume PDF</label>
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-ink">GitHub URL</label>
        <input
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          className="block w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm"
          placeholder="https://github.com/..."
          type="url"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-ink">LinkedIn URL</label>
        <input
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          className="block w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm"
          placeholder="https://linkedin.com/in/..."
          type="url"
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
        {isSubmitting ? "Submitting..." : "Submit application"}
      </button>
    </form>
  );
}
