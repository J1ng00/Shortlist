"use client";

import Link from "next/link";
import { Loader2, Upload } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Card, Pill } from "@/components/ui";
import { createCandidate } from "./actions";

type CandidateUploadFormProps = {
  jobs: Array<{
    id: string;
    role_title: string;
    business_name: string;
  }>;
  selectedJobId?: string;
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-paper transition hover:bg-moss disabled:cursor-not-allowed disabled:bg-ink/30 disabled:text-paper/70"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      {pending ? "Uploading..." : "Upload candidate"}
    </button>
  );
}

export function CandidateUploadForm({ jobs, selectedJobId }: CandidateUploadFormProps) {
  const hasJobs = jobs.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Candidate details</h2>
          <Pill>PDF upload</Pill>
        </div>
        <form action={createCandidate} className="mt-6 grid gap-5">
          <label className="grid gap-2 text-sm font-bold">
            Job
            <select
              className="rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal outline-none focus:border-clay"
              disabled={!hasJobs}
              name="job_id"
              required
              defaultValue={selectedJobId}
            >
              {hasJobs ? null : <option value="">Create a job first</option>}
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.role_title} at {job.business_name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Candidate name
              <input
                className="rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal outline-none focus:border-clay"
                name="full_name"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Current position
              <input
                className="rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal outline-none focus:border-clay"
                name="current_position"
              />
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Email
              <input
                className="rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal outline-none focus:border-clay"
                name="email"
                type="email"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Phone
              <input
                className="rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal outline-none focus:border-clay"
                name="phone"
                type="tel"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-bold">
            Resume PDF
            <input
              accept="application/pdf"
              className="rounded-2xl border border-dashed border-ink/20 bg-white/70 p-3 font-normal file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-bold file:text-paper hover:border-ink/30 focus:border-clay"
              name="resume"
              required
              type="file"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              GitHub URL
              <input
                className="rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal outline-none focus:border-clay"
                name="github_url"
                placeholder="https://github.com/..."
                type="url"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              LinkedIn URL
              <input
                className="rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal outline-none focus:border-clay"
                name="linkedin_url"
                placeholder="https://linkedin.com/in/..."
                type="url"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-bold">
            Manual profile notes
            <textarea
              className="min-h-32 rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal leading-6 outline-none focus:border-clay"
              name="profile_notes"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-full border border-ink/20 bg-paper px-5 py-3 text-sm font-bold text-ink transition hover:border-ink/40"
              href="/jobs"
            >
              Back
            </Link>
            <SubmitButton disabled={!hasJobs} />
          </div>
        </form>
      </Card>

      <Card>
        <p className="text-sm font-bold text-ink/60">Upload output</p>
        <h2 className="mt-1 text-2xl font-black">What gets saved</h2>
        <div className="mt-5 space-y-4 text-sm leading-6 text-ink/70">
          <p>The candidate record is saved in Supabase with the selected job, links, and profile notes.</p>
          <p>The CV is uploaded to the private Supabase Storage bucket named candidate-resumes.</p>
          <p>After upload, the candidate opens in review stage so the analysis step can be connected next.</p>
        </div>
      </Card>
    </div>
  );
}
