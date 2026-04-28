import { AlertTriangle, ArrowLeft, CheckCircle2, Github, MessageSquareText, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { ButtonLink, Card, Pill } from "@/components/ui";
import { getCandidate, getJob } from "@/lib/mock-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { analyzeCandidate } from "./actions";

type CandidatePageProps = {
  params: Promise<{
    id: string;
  }>;
};

type SavedCandidate = {
  id: string;
  job_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  current_position: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  profile_notes: string | null;
  resume_file_path: string | null;
  ai_candidate_output: {
    summary?: string;
    extracted_skills?: string[];
    strengths?: string[];
    missing_requirements?: string[];
    areas_to_validate?: string[];
    suggested_interview_questions?: string[];
  };
  initial_fit_score: number | null;
  jobs: {
    role_title: string;
    business_name: string;
  } | null;
};

type SavedCandidateRecord = Omit<SavedCandidate, "jobs"> & {
  jobs:
    | {
        role_title: string;
        business_name: string;
      }
    | Array<{
        role_title: string;
        business_name: string;
      }>
    | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { id } = await params;
  const isSavedCandidate = uuidPattern.test(id);

  if (isSavedCandidate) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("candidates")
      .select(
        "id, job_id, full_name, email, phone, current_position, github_url, linkedin_url, profile_notes, resume_file_path, ai_candidate_output, initial_fit_score, jobs(role_title, business_name)"
      )
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const record = data as unknown as SavedCandidateRecord;
    const candidate: SavedCandidate = {
      ...record,
      jobs: Array.isArray(record.jobs) ? record.jobs[0] ?? null : record.jobs
    };
    const output = candidate.ai_candidate_output ?? {};
    const extractedSkills = output.extracted_skills ?? [];
    const strengths = output.strengths ?? [];
    const missingRequirements = output.missing_requirements ?? [];
    const areasToValidate = output.areas_to_validate ?? [];
    const fitScore = candidate.initial_fit_score ?? 0;
    const hasAnalysis = Boolean(candidate.initial_fit_score || output.summary);
    const jobTitle = candidate.jobs?.role_title ?? "the selected role";
    const businessName = candidate.jobs?.business_name ?? "the business";

    return (
      <PageShell
        eyebrow="Step 2"
        title={candidate.full_name}
        description={`Candidate review for ${jobTitle} at ${businessName}. The resume is stored in Supabase and ready for analysis.`}
        actions={
          <>
            <form action={analyzeCandidate}>
              <input type="hidden" name="candidate_id" value={candidate.id} />
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-paper transition hover:bg-moss"
                type="submit"
              >
                {hasAnalysis ? "Refresh analysis" : "Analyze CV"}
              </button>
            </form>
            <ButtonLink href={`/interview/${candidate.id}`}>Start interview copilot</ButtonLink>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-6">
            <FitScore score={fitScore} />
            <Card>
              <p className="text-sm font-bold text-ink/60">Candidate profile</p>
              <div className="mt-4 space-y-3 text-sm text-ink/70">
                {candidate.current_position ? (
                  <p>
                    <strong className="text-ink">Current role:</strong> {candidate.current_position}
                  </p>
                ) : null}
                {candidate.email ? (
                  <p>
                    <strong className="text-ink">Email:</strong> {candidate.email}
                  </p>
                ) : null}
                {candidate.phone ? (
                  <p>
                    <strong className="text-ink">Phone:</strong> {candidate.phone}
                  </p>
                ) : null}
                {candidate.github_url ? (
                  <p>
                    <strong className="text-ink">GitHub:</strong> {candidate.github_url}
                  </p>
                ) : null}
                {candidate.linkedin_url ? (
                  <p>
                    <strong className="text-ink">LinkedIn:</strong> {candidate.linkedin_url}
                  </p>
                ) : null}
                {candidate.resume_file_path ? (
                  <p>
                    <strong className="text-ink">CV path:</strong> {candidate.resume_file_path}
                  </p>
                ) : null}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-black">AI candidate summary</h2>
                <Pill>{hasAnalysis ? "OpenAI analysis" : "Pending analysis"}</Pill>
              </div>
              <p className="mt-5 text-base leading-8 text-ink/75">
                {output.summary ??
                  "The CV upload is saved. Connect resume text extraction and candidate analysis to replace this pending state with an AI-generated scorecard."}
              </p>
            </Card>

            {candidate.profile_notes ? (
              <Card>
                <h2 className="text-xl font-black">Manager notes</h2>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink/70">{candidate.profile_notes}</p>
              </Card>
            ) : null}

            <Card>
              <h2 className="text-xl font-black">Extracted skills</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {extractedSkills.length ? extractedSkills.map((skill) => <Pill key={skill}>{skill}</Pill>) : <Pill>Not analyzed yet</Pill>}
              </div>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <h2 className="text-xl font-black">Strengths</h2>
                <ul className="mt-4 space-y-3">
                  {strengths.length ? (
                    strengths.map((highlight) => (
                      <li key={highlight} className="rounded-2xl bg-moss/10 p-4 text-sm leading-6 text-ink/70">
                        {highlight}
                      </li>
                    ))
                  ) : (
                    <li className="rounded-2xl bg-moss/10 p-4 text-sm leading-6 text-ink/70">Not analyzed yet.</li>
                  )}
                </ul>
              </Card>
              <Card>
                <h2 className="text-xl font-black">Missing requirements</h2>
                <ul className="mt-4 space-y-3">
                  {missingRequirements.length ? (
                    missingRequirements.map((risk) => (
                      <li key={risk} className="rounded-2xl bg-clay/10 p-4 text-sm leading-6 text-ink/70">
                        {risk}
                      </li>
                    ))
                  ) : (
                    <li className="rounded-2xl bg-clay/10 p-4 text-sm leading-6 text-ink/70">Not analyzed yet.</li>
                  )}
                </ul>
              </Card>
            </div>

            <Card>
              <h2 className="text-xl font-black">Areas to validate</h2>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {areasToValidate.length ? (
                  areasToValidate.map((area) => (
                    <li key={area} className="rounded-2xl border border-ink/10 bg-white/70 p-4 text-sm leading-6 text-ink/70">
                      {area}
                    </li>
                  ))
                ) : (
                  <li className="rounded-2xl border border-ink/10 bg-white/70 p-4 text-sm leading-6 text-ink/70">
                    Not analyzed yet.
                  </li>
                )}
              </ul>
            </Card>
          </div>
        </div>
      </PageShell>
    );
  }

  const candidate = getCandidate(id);
  const job = getJob(candidate.jobId);

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
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-line bg-moss/25 text-ink">
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

            <div className="rounded-xl border border-ink/20 bg-moss/25 p-5">
              <p className="text-xs font-black uppercase text-ink">AI recommendation</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <p className="text-2xl font-black text-ink">Strong fit</p>
                <p className="text-lg font-black text-navy">{candidate.fitScore}/100</p>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white">
                <div className="h-2 rounded-full bg-ink" style={{ width: `${candidate.fitScore}%` }} />
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
                <span className="inline-flex items-center gap-2 rounded-full bg-clay px-3 py-1 text-xs font-black text-navy">
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
                    <div className="h-2 rounded-full bg-moss/20">
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
                    <li key={highlight} className="rounded-lg border border-line bg-moss/15 p-4 text-sm leading-6 text-navy/75">
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
                    <li key={risk} className="rounded-lg border border-ink/15 bg-clay/45 p-4 text-sm leading-6 text-navy/80">
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

            <Card className="border-ink/20 bg-moss/15">
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
                    className="inline-flex w-full items-center justify-between rounded-lg border border-line bg-white px-4 py-3 text-sm font-black text-ink transition hover:border-ink/35 hover:bg-moss/15"
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
