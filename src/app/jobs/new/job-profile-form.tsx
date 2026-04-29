"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Card, Pill } from "@/components/ui";
import type { JobGenerationOutput } from "@/lib/job-ai";
import type { Job } from "@/lib/types";
import { createJob, updateJob } from "./actions";

function toText(items: string[]) {
  return items.join("\n");
}

function initialOutput(job: Job): JobGenerationOutput {
  return {
    job_description: job.generatedJobDescription,
    evaluation_rubric: job.evaluationRubric.map((item) => ({
      category: item.name,
      weight: item.weight,
      evidence_to_look_for: item.evidence
    })),
    interview_categories: job.interviewCategories
  };
}

function formSignature(form: HTMLFormElement) {
  const formData = new FormData(form);
  const fields = [
    "business_name",
    "role_title",
    "location",
    "work_type",
    "company_values",
    "must_have_skills",
    "nice_to_have_skills",
    "interview_focus"
  ];

  return JSON.stringify(fields.map((field) => String(formData.get(field) ?? "").trim()));
}

function jobSignature(job: Job) {
  return JSON.stringify([
    job.businessName,
    job.title,
    job.location,
    job.workType,
    toText(job.companyValues),
    toText(job.mustHaves),
    toText(job.niceToHaves),
    toText(job.interviewFocus)
  ]);
}

function SubmitButton({ disabled, mode }: { disabled: boolean; mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  const label = mode === "edit" ? "Save changes" : "Save job profile";

  return (
    <button
      className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-paper transition hover:bg-moss disabled:cursor-not-allowed disabled:bg-ink/30 disabled:text-paper/70"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? "Saving..." : label}
    </button>
  );
}

export function JobProfileForm({ job, mode = "create" }: { job: Job; mode?: "create" | "edit" }) {
  const formRef = useRef<HTMLFormElement>(null);
  const initialSignature = useMemo(() => jobSignature(job), [job]);
  const [output] = useState<JobGenerationOutput>(() => initialOutput(job));
  const [isDirty, setIsDirty] = useState(mode === "create");
  const formAction = mode === "edit" ? updateJob : createJob;
  const saveDisabled = mode === "edit" && !isDirty;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Job details</h2>
          <Pill>AI form</Pill>
        </div>
        <form
          ref={formRef}
          action={formAction}
          className="mt-6 grid gap-5"
          onChange={(event) => setIsDirty(formSignature(event.currentTarget) !== initialSignature)}
        >
          {mode === "edit" ? <input type="hidden" name="job_id" value={job.id} /> : null}
          <label className="grid gap-2 text-sm font-bold">
            Business name
            <input name="business_name" className="rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal outline-none focus:border-clay" defaultValue={job.businessName} />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Role title
            <input name="role_title" className="rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal outline-none focus:border-clay" defaultValue={job.title} />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Location
              <input name="location" className="rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal outline-none focus:border-clay" defaultValue={job.location} />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Work type
              <input name="work_type" className="rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal outline-none focus:border-clay" defaultValue={job.workType} />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-bold">
            Company values
            <textarea name="company_values" className="min-h-24 rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal leading-6 outline-none focus:border-clay" defaultValue={toText(job.companyValues)} />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Must-have skills
            <textarea name="must_have_skills" className="min-h-32 rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal leading-6 outline-none focus:border-clay" defaultValue={toText(job.mustHaves)} />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Nice-to-have skills
            <textarea name="nice_to_have_skills" className="min-h-24 rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal leading-6 outline-none focus:border-clay" defaultValue={toText(job.niceToHaves)} />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Interview focus
            <textarea name="interview_focus" className="min-h-32 rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal leading-6 outline-none focus:border-clay" defaultValue={toText(job.interviewFocus)} />
          </label>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-full border border-ink/20 bg-paper px-5 py-3 text-sm font-bold text-ink transition hover:border-ink/40"
              href="/jobs"
            >
              Back
            </Link>
            <SubmitButton disabled={saveDisabled} mode={mode} />
          </div>
        </form>
      </Card>

      <div className="space-y-6">
        <Card>
          <p className="text-sm font-bold text-ink/60">AI output</p>
          <h2 className="mt-1 text-2xl font-black">Generated job kit</h2>
          <div className="mt-5 space-y-4 text-sm leading-6 text-ink/70">
            <p>{output.job_description}</p>
            <div>
              <p className="font-bold text-ink">Interview categories</p>
              <p>{output.interview_categories.join(", ")}</p>
            </div>
          </div>
        </Card>
        <Card>
          <p className="text-sm font-bold text-ink/60">Evaluation rubric</p>
          <div className="mt-4 space-y-3">
            {output.evaluation_rubric.map((item) => (
              <div key={item.category} className="rounded-2xl bg-white/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold">{item.category}</p>
                  <p className="text-sm text-ink/60">{item.weight}%</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink/70">{item.evidence_to_look_for}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
