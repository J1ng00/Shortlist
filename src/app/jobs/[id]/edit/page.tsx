import { notFound } from "next/navigation";

import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui";
import type { JobGenerationOutput } from "@/lib/job-ai";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";
import { JobProfileForm } from "../../new/job-profile-form";

type JobRow = {
  id: string;
  role_title: string;
  business_name: string;
  location: string | null;
  work_type: string | null;
  company_values: string[];
  must_have_skills: string[];
  nice_to_have_skills: string[];
  interview_focus: string[];
  ai_job_output: JobGenerationOutput;
};

export const dynamic = "force-dynamic";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, role_title, business_name, location, work_type, company_values, must_have_skills, nice_to_have_skills, interview_focus, ai_job_output"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const row = data as JobRow;
  const output = row.ai_job_output ?? {
    job_description: "",
    evaluation_rubric: [],
    interview_categories: []
  };
  const job: Job = {
    id: row.id,
    title: row.role_title,
    businessName: row.business_name,
    location: row.location ?? "",
    workType: row.work_type ?? "",
    companyValues: row.company_values ?? [],
    mustHaves: row.must_have_skills ?? [],
    niceToHaves: row.nice_to_have_skills ?? [],
    interviewFocus: row.interview_focus ?? [],
    generatedJobDescription: output.job_description ?? "",
    evaluationRubric: (output.evaluation_rubric ?? []).map((item) => ({
      name: item.category,
      weight: item.weight,
      evidence: item.evidence_to_look_for
    })),
    interviewCategories: output.interview_categories ?? []
  };

  return (
    <PageShell
      eyebrow="Edit job"
      title={job.title}
      description="Adjust the job setup and regenerate the AI hiring kit before saving changes back to the job profile."
      actions={<ButtonLink href="/jobs" variant="secondary">Back to jobs</ButtonLink>}
    >
      <JobProfileForm job={job} mode="edit" />
    </PageShell>
  );
}
