import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { ButtonLink, Card, Pill } from "@/components/ui";
import { jobs } from "@/lib/mock-data";
import { createJob } from "./actions";

const job = jobs[0];

export default function NewJobPage() {
  return (
    <PageShell
      eyebrow="Step 1"
      title="Create a job profile"
      description="Keep the profile short and structured. This becomes the grounding context for candidate summaries, interview questions, and final recommendations."
      actions={<ButtonLink href="/candidates/cand-maya">Continue to candidate</ButtonLink>}
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black">Job details</h2>
            <Pill>Mock form</Pill>
          </div>
          <form action={createJob} className="mt-6 grid gap-5">
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
              <textarea name="company_values" className="min-h-24 rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal leading-6 outline-none focus:border-clay" defaultValue={job.companyValues.join("\n")} />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Must-have skills
              <textarea name="must_have_skills" className="min-h-32 rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal leading-6 outline-none focus:border-clay" defaultValue={job.mustHaves.join("\n")} />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Nice-to-have skills
              <textarea name="nice_to_have_skills" className="min-h-24 rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal leading-6 outline-none focus:border-clay" defaultValue={job.niceToHaves.join("\n")} />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Interview focus
              <textarea name="interview_focus" className="min-h-32 rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal leading-6 outline-none focus:border-clay" defaultValue={job.interviewFocus.join("\n")} />
            </label>
            <input type="hidden" name="generated_job_description" value={job.generatedJobDescription} />
            <input type="hidden" name="interview_categories" value={job.interviewCategories.join("\n")} />
            <input
              type="hidden"
              name="evaluation_rubric"
              value={job.evaluationRubric.map((item) => `${item.name}|${item.weight}|${item.evidence}`).join("\n")}
            />
            <button className="rounded-lg bg-navy px-5 py-3 text-sm font-bold text-paper transition hover:bg-ink" type="submit">
              Save job profile
            </button>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <p className="text-sm font-bold text-ink/60">Mock AI output</p>
            <h2 className="mt-1 text-2xl font-black">Generated job kit</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-ink/70">
              <p>{job.generatedJobDescription}</p>
              <div>
                <p className="font-bold text-ink">Interview categories</p>
                <p>{job.interviewCategories.join(", ")}</p>
              </div>
            </div>
            <Link className="mt-6 inline-flex text-sm font-bold text-ink hover:text-navy" href="/candidates/cand-maya">
              Skip save and continue with mock candidate
            </Link>
          </Card>
          <Card>
            <p className="text-sm font-bold text-ink/60">Evaluation rubric</p>
            <div className="mt-4 space-y-3">
              {job.evaluationRubric.map((item) => (
                <div key={item.name} className="rounded-xl border border-line bg-sand p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{item.name}</p>
                    <p className="text-sm text-ink/60">{item.weight}%</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{item.evidence}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
