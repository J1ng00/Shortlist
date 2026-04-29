import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui";
import { jobs } from "@/lib/mock-data";
import { JobProfileForm } from "./job-profile-form";

const job = jobs[0];

export default function NewJobPage() {
  return (
    <PageShell
      eyebrow="Step 1"
      title="Create a job profile"
      description="Keep the profile short and structured. This becomes the grounding context for candidate summaries, interview questions, and final recommendations."
      actions={<ButtonLink href="/candidates/new">Continue to candidate</ButtonLink>}
    >
      <JobProfileForm job={job} />
    </PageShell>
  );
}
