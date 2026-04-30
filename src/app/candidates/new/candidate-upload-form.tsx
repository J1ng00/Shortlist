"use client";

import { Loader2, Upload } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Card } from "@/components/ui";
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
      className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-black text-paper shadow-panel transition hover:bg-navy disabled:cursor-not-allowed disabled:bg-ink/30 disabled:text-paper/70"
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
    <div className="max-w-4xl">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Candidate details</h2>
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
            <SubmitButton disabled={!hasJobs} />
          </div>
        </form>
      </Card>

    </div>
  );
}
