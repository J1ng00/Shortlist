import Link from "next/link";
import { ClipboardList, MapPin, Pencil, Plus, Search, UserPlus } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { ButtonLink, Card, Pill } from "@/components/ui";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeWorkType, workTypeOptions } from "@/lib/work-types";
import { DeleteJobButton } from "./delete-job-button";

type SavedJob = {
  id: string;
  role_title: string;
  business_name: string;
  location: string | null;
  work_type: string | null;
  must_have_skills: string[];
  ai_job_output: {
    job_description?: string;
    evaluation_rubric?: Array<{
      category?: string;
      weight?: number;
      evidence_to_look_for?: string;
    }>;
    interview_categories?: string[];
  };
  created_at: string;
};

type JobsPageProps = {
  searchParams: Promise<{
    q?: string;
    workType?: string;
  }>;
};

function matchesSearch(job: SavedJob, query: string) {
  if (!query) {
    return true;
  }

  const rubricText = job.ai_job_output?.evaluation_rubric
    ?.map((item) => `${item.category ?? ""} ${item.evidence_to_look_for ?? ""}`)
    .join(" ");
  const haystack = [
    job.role_title,
    job.business_name,
    job.location,
    job.work_type,
    job.ai_job_output?.job_description,
    rubricText,
    ...(job.must_have_skills ?? []),
    ...(job.ai_job_output?.interview_categories ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export const dynamic = "force-dynamic";

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const { q = "", workType = "all" } = await searchParams;
  const supabase = createServerSupabaseClient();
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, role_title, business_name, location, work_type, must_have_skills, ai_job_output, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const savedJobs = (jobs ?? []) as SavedJob[];
  const filteredJobs = savedJobs.filter((job) => {
    const normalizedWorkType = normalizeWorkType(job.work_type);
    const workTypeMatch = workType === "all" || normalizedWorkType === workType;
    return workTypeMatch && matchesSearch(job, q);
  });

  return (
    <PageShell
      eyebrow="Jobs"
      title="Saved job profiles"
      description="Review the roles you have created, including the manager inputs and the generated AI hiring kit saved with each job."
      actions={
        <ButtonLink href="/jobs/new">
          <Plus className="h-4 w-4" />
          New job
        </ButtonLink>
      }
    >
      <Card className="mb-6 rounded-2xl">
        <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" action="/jobs">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/45" />
            <input
              className="h-12 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-sm font-bold outline-none focus:border-ink"
              defaultValue={q}
              name="q"
              placeholder="Search role, company, skill, location..."
            />
          </label>
          <select
            className="h-12 rounded-xl border border-line bg-white px-4 text-sm font-bold outline-none focus:border-ink"
            defaultValue={workType}
            name="workType"
          >
            <option value="all">All work types</option>
            {workTypeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <button
            aria-label="Search jobs"
            className="flex h-12 items-center justify-center rounded-xl bg-ink px-5 text-paper transition hover:bg-moss"
            type="submit"
          >
            <Search className="h-5 w-5" />
          </button>
        </form>
      </Card>

      {filteredJobs.length ? (
        <div className="grid gap-5">
          {filteredJobs.map((job) => {
            const summary = job.ai_job_output?.job_description;
            const rubric = job.ai_job_output?.evaluation_rubric ?? [];
            const categories = job.ai_job_output?.interview_categories ?? [];
            const normalizedWorkType = normalizeWorkType(job.work_type);

            return (
              <Card key={job.id}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone="good">Saved</Pill>
                      {normalizedWorkType ? <Pill>{normalizedWorkType}</Pill> : null}
                    </div>
                    <h2 className="mt-4 text-2xl font-black">{job.role_title}</h2>
                    <p className="mt-1 font-bold text-ink/70">{job.business_name}</p>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-ink/60">
                      {job.location ? (
                        <span className="inline-flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-2">
                        <span className="font-bold text-ink/70">Created on:</span>
                        {new Intl.DateTimeFormat("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        }).format(new Date(job.created_at))}
                      </span>
                    </div>
                    {summary ? <p className="mt-5 text-sm leading-6 text-ink/70">{summary}</p> : null}
                  </div>
                  <div className="grid w-full grid-cols-2 gap-2 sm:w-[430px] lg:shrink-0">
                    <Link
                      href={`/apply/${job.id}`}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-ink px-4 text-sm font-bold text-paper transition hover:bg-moss"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Application form
                    </Link>
                    <Link
                      href={`/candidates/new?jobId=${job.id}`}
                      aria-label={`Add candidate internally for ${job.role_title}`}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-ink/20 bg-paper px-4 text-sm font-bold text-ink transition hover:border-ink/40"
                      title="Add internally"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add internally
                    </Link>
                    <Link
                      href={`/jobs/${job.id}/edit`}
                      aria-label={`Edit ${job.role_title}`}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-ink/20 bg-paper px-4 text-sm font-bold text-ink transition hover:border-ink/40"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Link>
                    <DeleteJobButton jobId={job.id} roleTitle={job.role_title} />
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl bg-white/70 p-4">
                    <p className="text-sm font-bold text-ink">Must-have skills</p>
                    <p className="mt-2 text-sm leading-6 text-ink/60">
                      {job.must_have_skills.length ? job.must_have_skills.join(", ") : "No skills saved yet."}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-4">
                    <p className="text-sm font-bold text-ink">Interview categories</p>
                    <p className="mt-2 text-sm leading-6 text-ink/60">
                      {categories.length ? categories.join(", ") : "No categories generated yet."}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-4">
                    <p className="text-sm font-bold text-ink">Rubric</p>
                    <p className="mt-2 text-sm leading-6 text-ink/60">
                      {rubric.length
                        ? rubric.map((item) => `${item.category ?? "Category"} (${item.weight ?? 0}%)`).join(", ")
                        : "No rubric generated yet."}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">{savedJobs.length ? "No jobs found" : "No saved jobs yet"}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
                {savedJobs.length
                  ? "Adjust the search or work type filter to find a saved role."
                  : "Create a job profile, generate the AI kit, and save it. It will appear here with the generated summary, rubric, and interview categories."}
              </p>
            </div>
            {savedJobs.length ? null : <ButtonLink href="/jobs/new">Create first job</ButtonLink>}
          </div>
        </Card>
      )}
    </PageShell>
  );
}
