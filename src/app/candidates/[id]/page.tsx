import { AlertTriangle, ArrowLeft, CheckCircle2, Github, MessageSquareText, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { ButtonLink, Card, Pill } from "@/components/ui";
import { getCandidateBundle } from "@/lib/server-data";

type CandidatePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { id } = await params;
  const { candidate, job } = await getCandidateBundle(id);

  const matchSignals = [
    { label: "Role alignment", value: 92 },
    { label: "Operations evidence", value: candidate.fitScore },
    { label: "Interview readiness", value: 76 }
  ];

  return (
    <PageShell
      eyebrow="Candidate profile"
      title={candidate.name}
      description={`${candidate.currentRole} for ${job.title}. Review the AI summary, evidence, gaps, and interview prompts before moving to the next stage.`}
      actions={<ButtonLink href={`/interview/${candidate.id}`}>Start interview copilot</ButtonLink>}
    >
      <div className="space-y-6">
        <Card className="overflow-hidden p-0">
          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_280px] lg:items-center">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-line bg-sand text-ink">
                <UserRound className="h-9 w-9" />
              </div>
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-navy/60 hover:text-ink">
                    <ArrowLeft className="h-4 w-4" />
                    Back to dashboard
                  </Link>
                  <Pill tone="good">{candidate.stage}</Pill>
                </div>
                <h2 className="text-3xl font-black text-navy">{candidate.name}</h2>
                <p className="mt-2 text-base font-bold text-navy/65">
                  {candidate.currentRole} · {candidate.experienceYears}+ years · {candidate.location}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {candidate.extractedSkills.slice(0, 3).map((skill) => (
                    <Pill key={skill}>{skill}</Pill>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-ink/30 bg-ink p-5 text-paper">
              <p className="text-xs font-black uppercase text-paper/70">AI recommendation</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <p className="text-2xl font-black text-paper">Strong fit</p>
                <p className="text-lg font-black text-paper">{candidate.fitScore}/100</p>
              </div>
              <div className="mt-4 h-2 rounded-full bg-paper/20">
                <div className="h-2 rounded-full bg-moss" style={{ width: `${candidate.fitScore}%` }} />
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-ink">AI candidate summary</p>
                  <h2 className="mt-1 text-2xl font-black text-navy">Review snapshot</h2>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-moss/20 px-3 py-1 text-xs font-black text-ink">
                  <Sparkles className="h-4 w-4" />
                  Resume parsed
                </span>
              </div>
              <p className="mt-5 max-w-4xl text-base leading-8 text-navy/75">{candidate.aiSummary}</p>
            </Card>

            <Card>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black text-navy">Match indicators</h2>
                <div className="flex items-center gap-2 text-sm font-bold text-navy/60">
                  <span className="h-2 w-2 rounded-full bg-ink" />
                  Candidate benchmark
                </div>
              </div>
              <div className="space-y-5">
                {matchSignals.map((signal) => (
                  <div key={signal.label}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-bold text-navy">{signal.label}</span>
                      <span className="font-black text-ink">{signal.value}% match</span>
                    </div>
                    <div className="h-2 rounded-full bg-sand">
                      <div className="h-2 rounded-full bg-ink" style={{ width: `${signal.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-ink" />
                  <h2 className="text-xl font-black text-navy">Strengths</h2>
                </div>
                <ul className="mt-4 space-y-3">
                  {candidate.strengths.map((highlight) => (
                    <li key={highlight} className="rounded-lg border border-line bg-sand p-4 text-sm leading-6 text-navy/75">
                      {highlight}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-ink" />
                  <h2 className="text-xl font-black text-navy">Risks to validate</h2>
                </div>
                <ul className="mt-4 space-y-3">
                  {candidate.missingRequirements.map((risk) => (
                    <li key={risk} className="rounded-lg border border-ink/15 bg-moss/15 p-4 text-sm leading-6 text-navy/80">
                      {risk}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <div className="flex items-center gap-3">
                <MessageSquareText className="h-5 w-5 text-ink" />
                <h2 className="text-xl font-black text-navy">Interview prompts</h2>
              </div>
              <ol className="mt-4 space-y-3">
                {candidate.suggestedInterviewQuestions.map((question, index) => (
                  <li key={question} className="grid grid-cols-[2rem_1fr] gap-3 rounded-lg border border-line bg-white p-4 text-sm leading-6 text-navy/75">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-black text-paper">
                      {index + 1}
                    </span>
                    <span>{question}</span>
                  </li>
                ))}
              </ol>
            </Card>

            <Card className="border-ink/20 bg-moss/60">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-ink" />
                <h2 className="text-xl font-black text-navy">Decision support</h2>
              </div>
              <p className="mt-4 text-sm leading-6 text-navy/75">
                The score should be treated as a structured review aid. Validate the gaps below before progressing.
              </p>
              <ul className="mt-4 space-y-3">
                {candidate.areasToValidate.map((area) => (
                  <li key={area} className="rounded-lg border border-ink/15 bg-white/75 p-4 text-sm leading-6 text-navy/75">
                    {area}
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <h2 className="text-xl font-black text-navy">Candidate links</h2>
              <div className="mt-4">
                {candidate.githubUrl ? (
                  <a
                    className="inline-flex w-full items-center justify-between rounded-lg border border-line bg-white px-4 py-3 text-sm font-black text-ink transition hover:border-ink/35 hover:bg-moss/60"
                    href={candidate.githubUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      GitHub profile
                    </span>
                    <span>Open</span>
                  </a>
                ) : (
                  <p className="text-sm text-navy/60">No public links added.</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        <div className="sticky bottom-4 z-10 rounded-xl border border-line bg-white/95 p-4 shadow-panel backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-ink">Decision required</p>
              <p className="mt-1 text-sm text-navy/65">Compare the evidence against the role before approving the next stage.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={`/interview/${candidate.id}`} variant="secondary">Compare with benchmark</ButtonLink>
              <ButtonLink href={`/interview/${candidate.id}`}>Approve for next stage</ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
