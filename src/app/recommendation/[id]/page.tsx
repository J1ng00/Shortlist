import { PageShell } from "@/components/page-shell";
import { ButtonLink, Card, FitScore, Pill } from "@/components/ui";
import { getCandidate, getJob, getRecommendation } from "@/lib/mock-data";

type RecommendationPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RecommendationPage({ params }: RecommendationPageProps) {
  const { id } = await params;
  const candidate = getCandidate(id);
  const job = getJob(candidate.jobId);
  const recommendation = getRecommendation(candidate.id);
  const decisionLabel = recommendation.decision.replaceAll("_", " ");

  return (
    <PageShell
      eyebrow="Step 4"
      title="Final hiring recommendation"
      description={`A concise manager-ready memo for ${candidate.name}. For the MVP this is mock generated; later it should combine job profile, resume summary, interview notes, and references.`}
      actions={<ButtonLink href="/">Back to flow</ButtonLink>}
    >
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <FitScore score={candidate.fitScore} />
          <Card>
            <p className="text-sm font-bold text-ink/60">Decision</p>
            <h2 className="mt-3 text-4xl font-black capitalize tracking-tight">{decisionLabel}</h2>
            <div className="mt-4">
              <Pill tone={recommendation.confidence === "High" ? "good" : "warn"}>
                {recommendation.confidence} confidence
              </Pill>
            </div>
          </Card>
        </div>

        <Card>
          <div className="border-b border-ink/10 pb-6">
            <p className="text-sm font-bold text-ink/60">{job.businessName}</p>
            <h2 className="mt-2 text-3xl font-black">{candidate.name} for {job.title}</h2>
            <p className="mt-3 text-sm leading-6 text-ink/60">
              Recommendation generated from the current mock profile, candidate summary, and interview notes.
            </p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <section>
              <h3 className="text-lg font-black">Supporting evidence</h3>
              <ul className="mt-4 space-y-3">
                {recommendation.supportingEvidence.map((item) => (
                  <li key={item} className="rounded-2xl bg-moss/10 p-4 text-sm leading-6 text-ink/70">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="text-lg font-black">Concerns</h3>
              <ul className="mt-4 space-y-3">
                {recommendation.concerns.map((item) => (
                  <li key={item} className="rounded-2xl bg-clay/10 p-4 text-sm leading-6 text-ink/70">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <div className="mt-6 rounded-2xl border border-ink/10 bg-white/70 p-5">
            <p className="text-sm font-bold text-ink/60">Next step</p>
            <p className="mt-2 leading-7 text-ink/75">{recommendation.nextStep}</p>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
