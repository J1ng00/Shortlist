import { AlertTriangle, CheckCircle2, ChevronDown, Github, Linkedin, Mail, MessageSquareText, Mic2, ShieldCheck, Sparkles, UserRound, Video } from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { ButtonLink, Card, Pill } from "@/components/ui";
import { ActionSubmitButton } from "@/components/candidates/action-submit-button";
import { ScheduleInterviewModal } from "@/components/candidates/schedule-interview-modal";
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
    email_preview_url?: string | null;
    interview_date?: string | null;
    interview_time?: string | null;
  };
  interview_summary?: {
    headline?: string;
    summary?: string;
    strengths?: string[];
    concerns?: string[];
    nextStep?: string;
    finalizedAt?: string;
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

function scheduledInterviewLabel(aiOutput: CandidateAiOutput) {
  const date = aiOutput.hr_decision?.interview_date;
  const time = aiOutput.hr_decision?.interview_time;

  if (!date || !time) {
    return null;
  }

  const scheduledAt = new Date(`${date}T${time}`);

  if (Number.isNaN(scheduledAt.getTime())) {
    return `${date} at ${time}`;
  }

  return `${scheduledAt.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} at ${scheduledAt.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function processRecommendation(candidate: Candidate, aiOutput: CandidateAiOutput, aiStatus?: string) {
  const scheduledInterview = scheduledInterviewLabel(aiOutput);
  const decision = aiOutput.hr_decision;

  if (decision?.outcome === "rejected") {
    return {
      label: "Decision made",
      title: "Candidate has been rejected.",
      body: decision.note ?? "This profile is stored as a decision-stage record. No further interview action is needed.",
      action: "No next action required unless you want to revisit the decision.",
    };
  }

  if (decision?.outcome === "hired") {
    return {
      label: "Decision made",
      title: "Candidate is marked for hire.",
      body: decision.note ?? "This profile has reached the final decision stage.",
      action: "Prepare offer or onboarding follow-up outside the screening flow.",
    };
  }

  if (aiOutput.interview_summary) {
    return {
      label: "Interview completed",
      title: aiOutput.interview_summary.headline ?? "Interview completed.",
      body: aiOutput.interview_summary.summary ?? "The interview summary has been saved for this candidate.",
      action: aiOutput.interview_summary.nextStep ?? "Review interview evidence and choose whether to schedule another interview, reject, or progress to a final decision.",
    };
  }

  if (candidate.stage === "interview" || decision?.outcome === "next_stage") {
    return {
      label: scheduledInterview ? "Interview scheduled" : "Interview stage",
      title: scheduledInterview ? `Interview scheduled for ${scheduledInterview}.` : "Candidate is ready for interview.",
      body: decision?.note ?? "The candidate has been moved out of review and into the interview process.",
      action: scheduledInterview ? "Run the interview, then record the interview summary before making a final decision." : "Schedule an interview or start the interview copilot.",
    };
  }

  if (aiStatus !== "ready") {
    return {
      label: "Awaiting analysis",
      title: "Run AI analysis before deciding.",
      body: "The candidate has been submitted, but the role-specific analysis is not ready yet.",
      action: "Analyze fit, then review the evidence before moving the candidate forward.",
    };
  }

  if (aiOutput.recommendation === "reject" || candidate.fitScore < 60) {
    return {
      label: "Review stage",
      title: "Recommendation: do not progress yet.",
      body: aiOutput.recommendation_reason ?? candidate.aiSummary,
      action: "Validate the gaps, then reject or keep in review if more evidence is needed.",
    };
  }

  return {
    label: "Review stage",
    title: aiOutput.recommendation_headline ?? `Recommendation: ${candidate.fitScore >= 80 ? "strong fit" : "potential fit"}.`,
    body: aiOutput.recommendation_reason ?? candidate.aiSummary,
    action: aiOutput.next_best_action ?? "Move to interview once the reviewer is comfortable with the evidence.",
  };
}

async function getCandidateView(id: string): Promise<{ candidate: Candidate; job: Job; aiOutput: CandidateAiOutput; aiStatus?: string; skillMatch?: CandidateAiOutput["skill_match"]; email?: string | null; linkedinUrl?: string | null; source: "supabase" | "mock" }> {
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
    email: data.email,
    linkedinUrl: data.linkedin_url ?? submittedApplication.linkedin_url,
    source: "supabase",
  };
}

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { id } = await params;
  const { candidate, job, aiOutput, aiStatus, skillMatch, email, linkedinUrl, source } = await getCandidateView(id);

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
  const currentRecommendation = processRecommendation(candidate, aiOutput, aiStatus);
  const canAnalyze = source === "supabase" && aiStatus !== "ready";
  const candidateIsSaved = source === "supabase";

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
          <ButtonLink href={`/candidates/${candidate.id}/ask-ai`} variant="secondary">Ask AI</ButtonLink>
          <details className="group relative">
            <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-paper transition hover:bg-moss [&::-webkit-details-marker]:hidden">
              Interview
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-line bg-paper p-2 shadow-panel">
              <Link
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold text-ink transition hover:bg-moss/15"
                href={`/interview/${candidate.id}`}
              >
                <Mic2 className="h-4 w-4" />
                Start interview copilot
              </Link>
              {candidateIsSaved ? (
                <>
                  <ScheduleInterviewModal action={updateCandidateDecision} candidateId={candidate.id} label="Schedule interview" variant="menu" />
                  <Link
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold text-ink transition hover:bg-moss/15"
                    href={`/interview/${candidate.id}/live`}
                  >
                    <Video className="h-4 w-4" />
                    Join live interview
                  </Link>
                </>
              ) : null}
            </div>
          </details>
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
                {candidateIsSaved ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <form action={updateCandidateDecision}>
                      <input name="candidate_id" type="hidden" value={candidate.id} />
                      <input name="outcome" type="hidden" value="review" />
                      <ActionSubmitButton pendingLabel="Updating..." variant="secondary">Keep in review</ActionSubmitButton>
                    </form>
                    <ScheduleInterviewModal action={updateCandidateDecision} candidateId={candidate.id} />
                    <form action={updateCandidateDecision}>
                      <input name="candidate_id" type="hidden" value={candidate.id} />
                      <input name="outcome" type="hidden" value="hired" />
                      <ActionSubmitButton pendingLabel="Updating...">Hire now</ActionSubmitButton>
                    </form>
                    <form action={updateCandidateDecision}>
                      <input name="candidate_id" type="hidden" value={candidate.id} />
                      <input name="outcome" type="hidden" value="rejected" />
                      <ActionSubmitButton pendingLabel="Updating..." variant="danger">Reject candidate</ActionSubmitButton>
                    </form>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
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
              {aiOutput.hr_decision ? (
                <div className="rounded-xl border border-line bg-paper p-4">
                  <p className="text-xs font-black uppercase text-navy/55">HR decision</p>
                  <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-ink">{aiOutput.hr_decision.label}</p>
                      {aiOutput.hr_decision.note ? <p className="mt-2 text-sm leading-6 text-navy/65">{aiOutput.hr_decision.note}</p> : null}
                    </div>
                    {aiOutput.hr_decision.email_preview_url ? (
                      <a
                        className="inline-flex shrink-0 rounded-full bg-ink px-3 py-2 text-xs font-black text-paper transition hover:bg-moss"
                        href={aiOutput.hr_decision.email_preview_url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open email preview
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card className="border-ink/20 bg-white">
              <p className="text-sm font-black text-ink">{currentRecommendation.label}</p>
              <h2 className="mt-2 text-2xl font-black text-navy">{currentRecommendation.title}</h2>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-navy/75">{currentRecommendation.body}</p>
              <p className="mt-4 rounded-xl bg-moss/15 px-4 py-3 text-sm font-bold leading-6 text-navy">
                Recommended action: {currentRecommendation.action}
              </p>
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
            {aiOutput.interview_summary ? (
              <Card className="border-moss/25 bg-moss/10">
                <p className="text-sm font-black text-ink">Interview summary</p>
                <h2 className="mt-2 text-2xl font-black text-navy">
                  {aiOutput.interview_summary.headline ?? "Interview completed"}
                </h2>
                <p className="mt-4 text-sm leading-7 text-navy/75">
                  {aiOutput.interview_summary.summary ?? "Interview summary has been saved."}
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-black text-ink">Strengths from interview</p>
                    <ul className="mt-2 space-y-2">
                      {(aiOutput.interview_summary.strengths?.length
                        ? aiOutput.interview_summary.strengths
                        : ["No interview strengths saved yet."]
                      ).map((item) => (
                        <li key={item} className="rounded-lg border border-line bg-white p-3 text-sm leading-6 text-navy/75">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-black text-ink">Concerns to validate</p>
                    <ul className="mt-2 space-y-2">
                      {(aiOutput.interview_summary.concerns?.length
                        ? aiOutput.interview_summary.concerns
                        : ["No interview concerns saved yet."]
                      ).map((item) => (
                        <li key={item} className="rounded-lg border border-ink/15 bg-white/75 p-3 text-sm leading-6 text-navy/75">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ) : null}

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

          </div>
        </div>

        <Card>
          <h2 className="text-xl font-black text-navy">Why this recommendation</h2>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div>
              <p className="text-sm font-black text-ink">Evidence for</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                {(aiOutput.evidence_for?.length ? aiOutput.evidence_for : candidate.strengths.length ? candidate.strengths : ["No positive evidence returned yet."]).map((item) => (
                  <li key={item} className="rounded-lg border border-line bg-white p-3 text-sm leading-6 text-navy/75">{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-black text-ink">Evidence against</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
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
            {email || candidate.githubUrl || linkedinUrl ? (
              <div className="grid gap-3 lg:grid-cols-3">
                {email ? (
                  <a
                    className="inline-flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm font-black text-ink transition hover:border-ink/35 hover:bg-moss/15"
                    href={`mailto:${email}`}
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate">{email}</span>
                    </span>
                    <span>Email</span>
                  </a>
                ) : null}
                {candidate.githubUrl ? (
                  <a
                    className="inline-flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm font-black text-ink transition hover:border-ink/35 hover:bg-moss/15"
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
                    className="inline-flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm font-black text-ink transition hover:border-ink/35 hover:bg-moss/15"
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
    </PageShell>
  );
}
