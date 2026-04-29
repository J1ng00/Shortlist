import { CandidateUploadForm } from "@/components/candidates/candidate-upload-form";
import { PageShell } from "@/components/page-shell";

type Props = {
  params: Promise<{ jobId: string }>;
};

export default async function UploadCandidatePage({ params }: Props) {
  const { jobId } = await params;

  return (
    <PageShell
      eyebrow="Candidate upload"
      title="Create candidate"
      description="Upload a resume PDF and add optional profile links or notes. The candidate profile, skill match, gaps, and screening questions are generated after upload."
    >
      <CandidateUploadForm jobId={jobId} />
    </PageShell>
  );
}
