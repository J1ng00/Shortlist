import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageShell } from "@/components/page-shell";
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
      title="Create a job profile"
      description={
        <>
          <span className="font-black text-ink">Auto suggestions are included:</span>{" "}
          enter the business name and role title, and Shortlist will draft the values, skills, interview focus, job kit,
          and rubric for review.
        </>
      }
      prefix={
        <Link
          aria-label="Back to jobs"
          className="inline-flex text-ink transition hover:text-moss"
          href="/jobs"
          title="Back to jobs"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      }
    >
      <JobProfileForm job={job} />
    </PageShell>
  );
}
