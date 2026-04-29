import { AlertTriangle, ArrowLeft, CheckCircle2, Github, Linkedin, MessageSquareText, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { ButtonLink, Card, Pill } from "@/components/ui";
import { ActionSubmitButton } from "@/components/candidates/action-submit-button";
import { getCandidate, getJob } from "@/lib/mock-data";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Candidate, Job } from "@/lib/types";
import { analyzeCandidate, updateCandidateDecision } from "./actions";

type CandidatePageProps = {
  params: Promise<{
    id: string;
  }>;
};

type CandidateAiOutput = {
  status?: string;
  extracted_profile?: {
    fullName?: string;
    currentRole?: string;
    location?: string;
    experienceYears?: number;
    summary?: string;
    extractedSkills?: string[];
  };
  extracted_skills?: string[];
  strengths?: string[];
  missing_requirements?: string[];
  areas_to_validate?: string[];
  suggested_screening_questions?: Array<string | { question?: string; reason?: string }>;
  ai_summary?: string;
  skill_match?: {
    matched?: string[];
    partial?: string[];
    missing?: string[];
  };
  initial_fit_score?: number;
  recommendation?: "hire" | "progress" | "hold" | "reject";
  recommendation_headline?: string;
  recommendation_reason?: string;
  next_best_action?: string;
  evidence_for?: string[];
  evidence_against?: string[];
  hr_decision?: {
    outcome?: string;
    label?: string;
    note?: string | null;
  };
  submitted_application?: {
    github_url?: string | null;
    linkedin_url?: string | null;
    manual_profile_notes?: string | null;
  };
  analysis_error?: string;
};

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function questionText(question: string | { question?: string; reason?: string }) {
  if (typeof question === "string") {
    return question;
  }

  return question.reason ? `${question.question ?? "Screening question"} - ${question.reason}` : question.question ?? "Screening question";
}

async function getCandidateView(id: string): Promise<{ candidate: Candidate; job: Job; aiOutput: CandidateAiOutput; aiStatus?: string; skillMatch?: CandidateAiOutput["skill_match"]; linkedinUrl?: string | null; source: "supabase" | "mock" }> {
  const { data } = await supabaseAdmin
    .from("candidates")
    .select("*, jobs(*)")
    .eq("id", id)
    .maybeSingle();

  if (!data?.jobs) {
    const mockCandidate = getCandidate(id);
    return {
      candidate: mockCandidate,
      job: getJob(mockCandidate.jobId),
      aiOutput: {},
      source: "mock",
    };
  }

  const output = (data.ai_candidate_output ?? {}) as CandidateAiOutput;
  const profile = output.extracted_profile ?? {};
  const jobOutput = data.jobs.ai_job_output ?? {};
  const suggestedQuestions = output.suggested_screening_questions?.map(questionText) ?? [];
  const fallbackSkills = [...asStringArray(data.jobs.must_have_skills), ...asStringArray(data.jobs.nice_to_have_skills)].slice(0, 6);
  const submittedApplication = output.submitted_application ?? {};

  const candidate: Candidate = {
    id: data.id,
    jobId: data.job_id,
    name: profile.fullName || data.full_name,
    currentRole: profile.currentRole || data.current_position || "Role not extracted yet",
    experienceYears: profile.experienceYears ?? 0,
    location: profile.location || data.jobs.location || "Location not provided",
    githubUrl: data.github_url ?? submittedApplication.github_url ?? undefined,
    fitScore: output.initial_fit_score ?? data.initial_fit_score ?? 0,
    stage: data.stage,
    extractedSkills: output.extracted_skills ?? profile.extractedSkills ?? fallbackSkills,
    strengths: output.strengths ?? [],
    missingRequirements: output.missing_requirements ?? [],
    areasToValidate: output.areas_to_validate ?? [],
    suggestedInterviewQuestions: suggestedQuestions,
    aiSummary: output.ai_summary || profile.summary || "Candidate analysis is still processing.",
  };

  const job: Job = {
    id: data.jobs.id,
    title: data.jobs.role_title,
    businessName: data.jobs.business_name,
    location: data.jobs.location ?? "",
    workType: data.jobs.work_type ?? "",
    companyValues: asStringArray(data.jobs.company_values),
    mustHaves: asStringArray(data.jobs.must_have_skills),
    niceToHaves: asStringArray(data.jobs.nice_to_have_skills),
    interviewFocus: asStringArray(data.jobs.interview_focus),
    generatedJobDescription: jobOutput.job_description ?? "",
    evaluationRubric: jobOutput.evaluation_rubric ?? [],
    interviewCategories: jobOutput.interview_categories ?? [],
  };

  return {
    candidate,
    job,
    aiOutput: output,
    aiStatus: output.status,
    skillMatch: output.skill_match,
    linkedinUrl: data.linkedin_url ?? submittedApplication.linkedin_url,
    source: "supabase",
  };
}

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { id } = await params;
  const { candidate, job, aiOutput, aiStatus, skillMatch, linkedinUrl, source } = await getCandidateView(id);

  const matchSignals = [
    { label: "Matched skills", value: skillMatch?.matched?.length ?? candidate.extractedSkills.length },
    { label: "Partial matches", value: skillMatch?.partial?.length ?? candidate.strengths.length },
    { label: "Missing skills", value: skillMatch?.missing?.length ?? candidate.missingRequirements.length }
  ];
  const skillMatchGroups = skillMatch
    ? [
        { label: "Matched", skills: skillMatch.matched ?? [] },
        { label: "Partial", skills: skillMatch.partial ?? [] },
        { label: "Missing", skills: skillMatch.missing ?? [] },
      ]
    : null;
  const recommendationLabel = candidate.fitScore >= 80 ? "Strong fit" : candidate.fitScore >= 60 ? "Potential fit" : "Needs review";
  const recommendationHeadline = aiOutput.recommendation_headline ?? (
    aiOutput.recommendation === "reject"
      ? "You should not hire this candidate because the evidence does not meet the role requirements yet."
      : `You should ${candidate.fitScore >= 60 ? "consider" : "not progress"} this candidate because the current fit score is ${candidate.fitScore}/100.`
  );
  const recommendationReason = aiOutput.recommendation_reason ?? candidate.aiSummary;
  const nextBestAction = aiOutput.next_best_action ?? "Review the evidence, then choose whether to move the candidate to the next stage or reject them.";
  const canAnalyze = source === "supabase" && aiStatus !== "ready";

  return (
    <PageShell
      eyebrow="Candidate profile"
      title={candidate.name}
      description={`${candidate.currentRole} for ${job.title}. Review the AI summary, evidence, gaps, and interview prompts before moving to the next stage.`}
      actions={
        <>
          <ButtonLink href="/candidates" variant="secondary">Back to candidates</ButtonLink>
          {canAnalyze ? (
            <form action={analyzeCandidate}>
              <input name="candidate_id" type="hidden" value={candidate.id} />
              <ActionSubmitButton pendingLabel="Analyzing...">
                <Sparkles className="h-4 w-4" />
                Analyze fit
              </ActionSubmitButton>
            </form>
          ) : null}
          <ButtonLink href={`/interview/${candidate.id}`}>Start interview copilot</ButtonLink>
        </>
      }
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
                  <Pill tone="good">{aiOutput.hr_decision?.label ?? candidate.stage}</Pill>
                  <Pill>{aiStatus === "ready" || source === "mock" ? "AI analyzed" : aiStatus ?? "Awaiting AI"}</Pill>
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
                <p className="text-2xl font-black text-ink">{recommendationLabel}</p>
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
            <Card className="border-ink/20 bg-white">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-black text-ink">Hiring recommendation</p>
                  <h2 className="mt-2 text-2xl font-black text-navy">{recommendationHeadline}</h2>
                  <p className="mt-4 max-w-4xl text-sm leading-7 text-navy/75">{recommendationReason}</p>
                  <p className="mt-4 rounded-xl bg-moss/15 px-4 py-3 text-sm font-bold leading-6 text-navy">
                    Next action: {nextBestAction}
                  </p>
                </div>
                {aiOutput.hr_decision ? (
                  <div className="rounded-xl border border-line bg-paper p-4">
                    <p className="text-xs font-black uppercase text-navy/55">HR decision</p>
                    <p className="mt-2 text-lg font-black text-ink">{aiOutput.hr_decision.label}</p>
                    {aiOutput.hr_decision.note ? <p className="mt-2 text-sm leading-6 text-navy/65">{aiOutput.hr_decision.note}</p> : null}
                  </div>
                ) : null}
              </div>
            </Card>

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
                <h2 className="text-xl font-black text-navy">Skill match</h2>
                <div className="flex items-center gap-2 text-sm font-bold text-navy/60">
                  <span className="h-2 w-2 rounded-full bg-ink" />
                  Candidate requirements
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {matchSignals.map((signal) => (
                  <div key={signal.label} className="rounded-lg border border-line bg-white p-4">
                    <p className="text-sm font-bold text-navy/65">{signal.label}</p>
                    <p className="mt-2 text-2xl font-black text-ink">{signal.value}</p>
                  </div>
                ))}
              </div>
              {skillMatchGroups ? (
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {skillMatchGroups.map(({ label, skills }) => (
                    <div key={label}>
                      <p className="mb-2 text-sm font-black text-navy">{label}</p>
                      <div className="flex flex-wrap gap-2">
                        {skills.length ? skills.map((skill) => <Pill key={skill}>{skill}</Pill>) : <span className="text-sm text-navy/60">None</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-ink" />
                  <h2 className="text-xl font-black text-navy">Strengths</h2>
                </div>
                <ul className="mt-4 space-y-3">
                  {(candidate.strengths.length ? candidate.strengths : ["Analysis has not returned strengths yet."]).map((highlight) => (
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
                  {(candidate.missingRequirements.length ? candidate.missingRequirements : ["Analysis has not returned missing requirements yet."]).map((risk) => (
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
              <h2 className="text-xl font-black text-navy">HR stage controls</h2>
              <p className="mt-2 text-sm leading-6 text-navy/65">
                Choose the operational outcome for this candidate. Rejected and hired candidates are stored as decision-stage records.
              </p>
              <div className="mt-4 grid gap-3">
                <form action={updateCandidateDecision}>
                  <input name="candidate_id" type="hidden" value={candidate.id} />
                  <input name="outcome" type="hidden" value="review" />
                  <ActionSubmitButton pendingLabel="Updating..." variant="secondary">Keep in review</ActionSubmitButton>
                </form>
                <form action={updateCandidateDecision}>
                  <input name="candidate_id" type="hidden" value={candidate.id} />
                  <input name="outcome" type="hidden" value="next_stage" />
                  <ActionSubmitButton pendingLabel="Updating...">Move to next stage</ActionSubmitButton>
                </form>
                <form action={updateCandidateDecision}>
                  <input name="candidate_id" type="hidden" value={candidate.id} />
                  <input name="outcome" type="hidden" value="rejected" />
                  <ActionSubmitButton pendingLabel="Updating..." variant="danger">Reject candidate</ActionSubmitButton>
                </form>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <MessageSquareText className="h-5 w-5 text-ink" />
                <h2 className="text-xl font-black text-navy">Interview prompts</h2>
              </div>
              <ol className="mt-4 space-y-3">
                {(candidate.suggestedInterviewQuestions.length ? candidate.suggestedInterviewQuestions : ["Analysis has not returned screening questions yet."]).map((question, index) => (
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
                {(candidate.areasToValidate.length ? candidate.areasToValidate : ["Analysis has not returned validation areas yet."]).map((area) => (
                  <li key={area} className="rounded-lg border border-ink/15 bg-white/75 p-4 text-sm leading-6 text-navy/75">
                    {area}
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <h2 className="text-xl font-black text-navy">Why this recommendation</h2>
              <div className="mt-4 grid gap-4">
                <div>
                  <p className="text-sm font-black text-ink">Evidence for</p>
                  <ul className="mt-2 space-y-2">
                    {(aiOutput.evidence_for?.length ? aiOutput.evidence_for : candidate.strengths.length ? candidate.strengths : ["No positive evidence returned yet."]).map((item) => (
                      <li key={item} className="rounded-lg border border-line bg-white p-3 text-sm leading-6 text-navy/75">{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-black text-ink">Evidence against</p>
                  <ul className="mt-2 space-y-2">
                    {(aiOutput.evidence_against?.length ? aiOutput.evidence_against : candidate.missingRequirements.length ? candidate.missingRequirements : ["No counter-evidence returned yet."]).map((item) => (
                      <li key={item} className="rounded-lg border border-ink/15 bg-clay/30 p-3 text-sm leading-6 text-navy/75">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-black text-navy">Candidate links</h2>
              <div className="mt-4">
                {candidate.githubUrl || linkedinUrl ? (
                  <div className="space-y-3">
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
                    ) : null}
                    {linkedinUrl ? (
                      <a
                        className="inline-flex w-full items-center justify-between rounded-lg border border-line bg-white px-4 py-3 text-sm font-black text-ink transition hover:border-ink/35 hover:bg-moss/15"
                        href={linkedinUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Linkedin className="h-4 w-4" />
                          LinkedIn profile
                        </span>
                        <span>Open</span>
                      </a>
                    ) : null}
                  </div>
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
              <form action={updateCandidateDecision}>
                <input name="candidate_id" type="hidden" value={candidate.id} />
                <input name="outcome" type="hidden" value="rejected" />
                <ActionSubmitButton pendingLabel="Updating..." variant="danger">Reject</ActionSubmitButton>
              </form>
              <form action={updateCandidateDecision}>
                <input name="candidate_id" type="hidden" value={candidate.id} />
                <input name="outcome" type="hidden" value="next_stage" />
                <ActionSubmitButton pendingLabel="Updating...">Move to next stage</ActionSubmitButton>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
