import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui";
import type { Job } from "@/lib/types";
import { JobProfileForm } from "./job-profile-form";

const job: Job = {
  id: "",
  title: "",
  businessName: "",
  location: "",
  workType: "",
  companyValues: [],
  mustHaves: [],
  niceToHaves: [],
  interviewFocus: [],
  generatedJobDescription: "",
  evaluationRubric: [],
  interviewCategories: []
};

export default function NewJobPage() {
  return (
    <PageShell
      eyebrow="Step 1"
      title="Create a job profile"
      description={
        <>
          <span className="font-black text-ink">Auto suggestions are included:</span>{" "}
          enter the business name and role title, and Shortlist will draft the values, skills, interview focus, job kit,
          and rubric for review.
        </>
      }
      actions={<ButtonLink href="/candidates/new">Continue to candidate</ButtonLink>}
    >
      <JobProfileForm job={job} />
    </PageShell>
  );
}
