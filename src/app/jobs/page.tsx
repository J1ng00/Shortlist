import Link from "next/link";
import { CalendarDays, MapPin, Pencil, Plus, Sparkles } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { ButtonLink, Card, Pill } from "@/components/ui";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const supabase = createServerSupabaseClient();
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, role_title, business_name, location, work_type, must_have_skills, ai_job_output, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const savedJobs = (jobs ?? []) as SavedJob[];

  return (
    <PageShell
      eyebrow="Jobs"
      title="Saved job profiles"
      description="Review the roles you have created, including the manager inputs and the generated AI hiring kit saved with each job."
      actions={
        <>
          <ButtonLink href="/jobs/new">
            <Plus className="h-4 w-4" />
            New job
          </ButtonLink>
          <ButtonLink href="/candidates/cand-maya" variant="secondary">
            Candidate
          </ButtonLink>
          <ButtonLink href="/interview/cand-maya" variant="secondary">
            Interview
          </ButtonLink>
          <ButtonLink href="/recommendation/cand-maya" variant="secondary">
            Memo
          </ButtonLink>
        </>
      }
    >
      {savedJobs.length ? (
        <div className="grid gap-5">
          {savedJobs.map((job) => {
            const summary = job.ai_job_output?.job_description;
            const rubric = job.ai_job_output?.evaluation_rubric ?? [];
            const categories = job.ai_job_output?.interview_categories ?? [];

            return (
              <Card key={job.id}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone="good">Saved</Pill>
                      {job.work_type ? <Pill>{job.work_type}</Pill> : null}
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
                        <CalendarDays className="h-4 w-4" />
                        {new Intl.DateTimeFormat("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        }).format(new Date(job.created_at))}
                      </span>
                    </div>
                    {summary ? <p className="mt-5 text-sm leading-6 text-ink/70">{summary}</p> : null}
                  </div>
                  <Link
                    href={`/jobs/${job.id}/edit`}
                    className="inline-flex items-center justify-center rounded-full border border-ink/20 bg-paper px-4 py-2 text-sm font-bold text-ink transition hover:border-ink/40"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl bg-white/70 p-4">
                    <p className="text-sm font-bold text-ink">Must-have skills</p>
                    <p className="mt-2 text-sm leading-6 text-ink/60">
                      {job.must_have_skills.length ? job.must_have_skills.join(", ") : "No skills saved yet."}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-4">
                    <p className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                      <Sparkles className="h-4 w-4 text-clay" />
                      Interview categories
                    </p>
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
              <h2 className="text-2xl font-black">No saved jobs yet</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
                Create a job profile, generate the AI kit, and save it. It will appear here with the generated summary,
                rubric, and interview categories.
              </p>
            </div>
            <ButtonLink href="/jobs/new">Create first job</ButtonLink>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
