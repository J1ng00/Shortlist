import { PageShell } from "@/components/page-shell";
import { ButtonLink, Card, FitScore, Pill } from "@/components/ui";
import { getCandidate, getJob } from "@/lib/mock-data";

type CandidatePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { id } = await params;
  const candidate = getCandidate(id);
  const job = getJob(candidate.jobId);

  return (
    <PageShell
      eyebrow="Step 2"
      title={candidate.name}
      description={`AI-generated candidate summary for ${job.title} at ${job.businessName}. This screen uses mock resume data now and can later connect to Supabase Storage + OpenAI extraction.`}
      actions={<ButtonLink href={`/interview/${candidate.id}`}>Start interview copilot</ButtonLink>}
    >
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <FitScore score={candidate.fitScore} />
          <Card>
            <p className="text-sm font-bold text-ink/60">Candidate profile</p>
            <div className="mt-4 space-y-3 text-sm text-ink/70">
              <p>
                <strong className="text-ink">Current role:</strong> {candidate.currentRole}
              </p>
              <p>
                <strong className="text-ink">Experience:</strong> {candidate.experienceYears} years
              </p>
              <p>
                <strong className="text-ink">Location:</strong> {candidate.location}
              </p>
              {candidate.githubUrl ? (
                <p>
                  <strong className="text-ink">GitHub:</strong> {candidate.githubUrl}
                </p>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-black">AI candidate summary</h2>
              <Pill>Mock resume parse</Pill>
            </div>
            <p className="mt-5 text-base leading-8 text-ink/75">{candidate.aiSummary}</p>
          </Card>

          <Card>
            <h2 className="text-xl font-black">Extracted skills</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {candidate.extractedSkills.map((skill) => (
                <Pill key={skill}>{skill}</Pill>
              ))}
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h2 className="text-xl font-black">Strengths</h2>
              <ul className="mt-4 space-y-3">
                {candidate.strengths.map((highlight) => (
                  <li key={highlight} className="rounded-2xl bg-moss/10 p-4 text-sm leading-6 text-ink/70">
                    {highlight}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h2 className="text-xl font-black">Missing requirements</h2>
              <ul className="mt-4 space-y-3">
                {candidate.missingRequirements.map((risk) => (
                  <li key={risk} className="rounded-2xl bg-clay/10 p-4 text-sm leading-6 text-ink/70">
                    {risk}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card>
            <h2 className="text-xl font-black">Areas to validate</h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {candidate.areasToValidate.map((area) => (
                <li key={area} className="rounded-2xl border border-ink/10 bg-white/70 p-4 text-sm leading-6 text-ink/70">
                  {area}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
