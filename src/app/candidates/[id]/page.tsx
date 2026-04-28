import { PageShell } from "@/components/page-shell";
import { PreInterviewScorecardView } from "@/components/pre-interview-scorecard";
import { ButtonLink } from "@/components/ui";
import { getPreInterviewScorecard } from "@/lib/scorecard";

type CandidatePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { id } = await params;
  const scorecard = await getPreInterviewScorecard(id);

  return (
    <PageShell
      eyebrow="Step 2"
      title={scorecard.candidateName}
      description={`Pre-interview scorecard for ${scorecard.jobTitle}. Loads from Supabase candidate analysis when available, with mock fallback so the demo flow is not blocked.`}
      actions={<ButtonLink href={`/interview/${scorecard.candidateId}`}>Start interview copilot</ButtonLink>}
    >
      <PreInterviewScorecardView scorecard={scorecard} />
    </PageShell>
  );
}
