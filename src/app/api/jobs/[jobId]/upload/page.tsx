import { CandidateUploadForm } from "@/components/candidates/candidate-upload-form";
import { PageShell } from "@/components/page-shell";

type Props = {
  params: Promise<{ jobId: string }>;
};

export default async function UploadCandidatePage({ params }: Props) {
  const { jobId } = await params;

  return (
    <PageShell
      eyebrow="Step 1"
      title="Upload candidate"
      description="Upload a resume and optional links to generate an AI candidate summary."
    >
      <CandidateUploadForm jobId={jobId} />
    </PageShell>
  );
}