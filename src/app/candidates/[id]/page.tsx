import { AlertTriangle, ArrowLeft, CheckCircle2, Github, Linkedin, Mail, MessageSquareText, ShieldCheck, Sparkles, UserRound, Video } from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui";
import { ActionSubmitButton } from "@/components/candidates/action-submit-button";
import { AskAiModal } from "@/components/candidates/ask-ai-modal";
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
  interview_summary_count?: number;
  submitted_application?: {
    github_url?: string | null;
    linkedin_url?: string | null;
    manual_profile_notes?: string | null;
  };
  analysis_error?: string;
};

type CandidateStatus = "review" | "interview" | "reject" | "hired";

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

function hasScheduledInterview(aiOutput: CandidateAiOutput) {
  return Boolean(aiOutput.hr_decision?.interview_date && aiOutput.hr_decision?.interview_time);
}

function completedInterviewCount(aiOutput: CandidateAiOutput) {
  if (typeof aiOutput.interview_summary_count === "number" && aiOutput.interview_summary_count > 0) {
    return aiOutput.interview_summary_count;
  }

  return aiOutput.interview_summary ? 1 : 0;
}

function scheduleActionLabel(aiOutput: CandidateAiOutput) {
  return hasScheduledInterview(aiOutput) || completedInterviewCount(aiOutput) > 0 ? "Reschedule" : "Schedule";
}

function processRecommendation(candidate: Candidate, aiOutput: CandidateAiOutput, aiStatus?: string) {
  const scheduledInterview = scheduledInterviewLabel(aiOutput);
  const decision = aiOutput.hr_decision;

  if (decision?.outcome === "rejected") {
    return {
      label: "Rejected",
      title: "Candidate rejected",
      body: null,
      action: decision.note ?? "No next action required unless the decision is reopened.",
    };
  }

  if (decision?.outcome === "hired") {
    return {
      label: "Hired",
      title: "Candidate marked for hire",
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
      action: scheduledInterview ? "Run the live interview, then record the interview summary before making a final decision." : "Schedule an interview or join the live interview.",
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

function candidateStatus(candidate: Candidate, aiOutput: CandidateAiOutput): CandidateStatus {
  if (aiOutput.hr_decision?.outcome === "rejected" || candidate.stage === "reject") {
    return "reject";
  }

  if (aiOutput.hr_decision?.outcome === "hired" || candidate.stage === "hired") {
    return "hired";
  }

  return candidate.stage === "interview" ? "interview" : "review";
}

function statusLabel(status: CandidateStatus) {
  return {
    review: "Review",
    interview: "Interview",
    reject: "Rejected",
    hired: "Hired"
  }[status];
}

function pipelineStatusLabel(status: CandidateStatus, aiOutput: CandidateAiOutput) {
  const completedInterviews = completedInterviewCount(aiOutput);

  if (status === "reject" || status === "hired") {
    return statusLabel(status);
  }

  if (completedInterviews > 0) {
    return `Interview #${completedInterviews} completed`;
  }

  if (hasScheduledInterview(aiOutput) || status === "interview") {
    return "Pending interview";
  }

  return statusLabel(status);
}

function aiStatusLabel(aiStatus: string | undefined, source: "supabase" | "mock") {
  if (aiStatus === "ready" || source === "mock") {
    return "AI analyzed";
  }

  if (aiStatus === "failed") {
    return "AI failed";
  }

  return aiStatus ?? "Awaiting AI";
}

async function getCandidateView(id: string): Promise<{ candidate: Candidate; job: Job; aiOutput: CandidateAiOutput; aiStatus?: string; email?: string | null; linkedinUrl?: string | null; source: "supabase" | "mock" }> {
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
    name: data.full_name || profile.fullName || "Unnamed candidate",
    currentRole: data.current_position || profile.currentRole || "Role not provided",
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
    email: data.email,
    linkedinUrl: data.linkedin_url ?? submittedApplication.linkedin_url,
    source: "supabase",
  };
}

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { id } = await params;
  const { candidate, job, aiOutput, aiStatus, email, linkedinUrl, source } = await getCandidateView(id);

  const recommendationLabel = candidate.fitScore >= 80 ? "Strong fit" : candidate.fitScore >= 60 ? "Potential fit" : "Needs review";
  const currentRecommendation = processRecommendation(candidate, aiOutput, aiStatus);
  const canAnalyze = source === "supabase" && aiStatus !== "ready";
  const candidateIsSaved = source === "supabase";
  const status = candidateStatus(candidate, aiOutput);
  const isRejected = status === "reject";
  const isHired = status === "hired";
  const isFinal = isRejected || isHired;
  const skillMatch = aiOutput.skill_match ?? {};
  const matchedSkills = skillMatch.matched ?? [];
  const partialSkills = skillMatch.partial ?? [];
  const missingSkills = skillMatch.missing ?? [];

  return (
    <PageShell
      eyebrow="Candidate profile"
      prefix={
        <Link
          aria-label="Back to candidates"
          className="inline-flex items-center justify-center text-ink transition hover:text-navy"
          href="/candidates"
          title="Back to candidates"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      }
      title={candidate.name}
      description={`${candidate.currentRole} for ${job.title}. Review the AI summary, evidence, gaps, and interview prompts before moving to the next stage.`}
    >
      <div className="space-y-6">
        {candidateIsSaved && !isFinal ? (
          <div className="flex justify-end">
            <Link
              className="inline-flex w-fit items-center justify-center gap-2 rounded-full border border-ink/15 bg-white/75 px-3 py-2 text-sm font-black text-ink shadow-sm transition hover:border-ink/30 hover:bg-moss/20"
              href={`/interview/${candidate.id}/live`}
              title="Interview Room: Run the live interview workspace"
            >
              <Video className="h-4 w-4" />
              Live interview
            </Link>
          </div>
        ) : null}

        <Card className="overflow-hidden p-0">
          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_520px] lg:items-center">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-line bg-moss/25 text-ink">
                <UserRound className="h-9 w-9" />
              </div>
              <div className="min-w-0">
                <h2 className="text-3xl font-black text-navy">{candidate.name}</h2>
                <p className="mt-2 text-base font-bold text-navy/65">
                  {candidate.currentRole} · {candidate.experienceYears}+ years · {candidate.location}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[0.85fr_1fr]">
              <div className="rounded-2xl border border-ink/20 bg-ink p-4 text-paper shadow-panel">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-paper/55">Current status</p>
                    <p className="mt-2 text-2xl font-black leading-none">{pipelineStatusLabel(status, aiOutput)}</p>
                  </div>
                  <span className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-paper/15 bg-paper/10 px-3 py-1 text-[11px] font-black text-paper/70">
                    {aiStatusLabel(aiStatus, source)}
                  </span>
                </div>
                {aiOutput.hr_decision?.note && !isRejected ? (
                  <p className="mt-4 text-sm leading-6 text-paper/75">{aiOutput.hr_decision.note}</p>
                ) : null}
                {aiOutput.hr_decision?.email_preview_url ? (
                  <a
                    className="mt-4 inline-flex rounded-full bg-paper px-3 py-2 text-xs font-black text-ink transition hover:bg-moss"
                    href={aiOutput.hr_decision.email_preview_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Email preview
                  </a>
                ) : null}
              </div>

              <div className="rounded-2xl border border-ink/20 bg-moss/25 p-4">
                <p className="text-xs font-black uppercase text-ink">AI recommendation</p>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <p className="text-2xl font-black text-ink">{recommendationLabel}</p>
                  <p className="text-lg font-black text-navy">{candidate.fitScore}/100</p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div className="h-2 rounded-full bg-ink" style={{ width: `${candidate.fitScore}%` }} />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {candidateIsSaved ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
            {!isFinal ? (
              <>
                <div className="rounded-2xl border border-ink/15 bg-paper p-4 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase text-navy/55">Stage</p>
                      <div className="mt-3 flex items-center gap-3">
                        <span className={`h-3 w-3 rounded-full ${status === "review" ? "bg-ink ring-4 ring-ink/15" : "bg-navy/25"}`} />
                        <span className="text-sm font-black text-navy">Review</span>
                        <span className="h-px w-10 bg-ink/20" />
                        <span className={`h-3 w-3 rounded-full ${status === "interview" ? "bg-ink ring-4 ring-ink/15" : "bg-navy/25"}`} />
                        <span className="text-sm font-black text-navy">Interview</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={updateCandidateDecision}>
                        <input name="candidate_id" type="hidden" value={candidate.id} />
                        <input name="outcome" type="hidden" value="review" />
                        <ActionSubmitButton pendingLabel="Updating..." variant="secondary">Keep reviewing</ActionSubmitButton>
                      </form>
                      {status === "interview" ? (
                        <ScheduleInterviewModal
                          action={updateCandidateDecision}
                          candidateId={candidate.id}
                          label={scheduleActionLabel(aiOutput)}
                        />
                      ) : (
                        <ScheduleInterviewModal
                          action={updateCandidateDecision}
                          candidateId={candidate.id}
                          label={scheduleActionLabel(aiOutput)}
                        />
                      )}
                      {canAnalyze ? (
                        <form action={analyzeCandidate}>
                          <input name="candidate_id" type="hidden" value={candidate.id} />
                          <ActionSubmitButton pendingLabel="Analyzing..." variant="secondary">
                            <Sparkles className="h-4 w-4" />
                            Analyze
                          </ActionSubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-ink/20 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase text-navy/55">Decision</p>
                      <p className="mt-1 text-sm font-bold text-navy/65">Final outcome</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:w-56">
                      <form action={updateCandidateDecision}>
                        <input name="candidate_id" type="hidden" value={candidate.id} />
                        <input name="outcome" type="hidden" value="hired" />
                        <ActionSubmitButton fullWidth pendingLabel="Updating...">Hire</ActionSubmitButton>
                      </form>
                      <form action={updateCandidateDecision}>
                        <input name="candidate_id" type="hidden" value={candidate.id} />
                        <input name="outcome" type="hidden" value="reject" />
                        <ActionSubmitButton fullWidth pendingLabel="Updating..." variant="danger">Reject</ActionSubmitButton>
                      </form>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-ink/15 bg-paper p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase text-navy/55">Status action</p>
                    <p className="mt-1 text-sm font-bold text-navy/65">
                      {isRejected ? "Undo the rejection and return this candidate to review." : "Return this candidate to review if the decision changes."}
                    </p>
                  </div>
                  <form action={updateCandidateDecision}>
                    <input name="candidate_id" type="hidden" value={candidate.id} />
                    <input name="outcome" type="hidden" value="review" />
                    <ActionSubmitButton pendingLabel="Reopening..." variant="secondary">
                      {isRejected ? "Undo reject" : "Reopen review"}
                    </ActionSubmitButton>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card className="border-ink/20 bg-white">
              <p className="text-sm font-black text-ink">{currentRecommendation.label}</p>
              <h2 className="mt-2 text-2xl font-black text-navy">{currentRecommendation.title}</h2>
              {currentRecommendation.body ? (
                <p className="mt-4 max-w-4xl text-sm leading-7 text-navy/75">{currentRecommendation.body}</p>
              ) : null}
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
              <h2 className="text-xl font-black text-navy">Skill match</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-line bg-white p-4">
                  <p className="text-xs font-black text-navy/55">Matched skills</p>
                  <p className="mt-2 text-2xl font-black text-ink">{matchedSkills.length}</p>
                </div>
                <div className="rounded-lg border border-line bg-white p-4">
                  <p className="text-xs font-black text-navy/55">Partial matches</p>
                  <p className="mt-2 text-2xl font-black text-ink">{partialSkills.length}</p>
                </div>
                <div className="rounded-lg border border-line bg-white p-4">
                  <p className="text-xs font-black text-navy/55">Missing skills</p>
                  <p className="mt-2 text-2xl font-black text-ink">{missingSkills.length}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div>
                  <p className="text-sm font-black text-ink">Matched</p>
                  <ul className="mt-2 space-y-2">
                    {(matchedSkills.length ? matchedSkills : ["No matched skills returned yet."]).map((skill) => (
                      <li key={skill} className="rounded-full border border-line bg-moss/15 px-3 py-2 text-xs font-black text-ink">
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-black text-ink">Partial</p>
                  <ul className="mt-2 space-y-2">
                    {(partialSkills.length ? partialSkills : ["No partial matches returned yet."]).map((skill) => (
                      <li key={skill} className="rounded-full border border-line bg-white px-3 py-2 text-xs font-black text-ink">
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-black text-ink">Missing</p>
                  <ul className="mt-2 space-y-2">
                    {(missingSkills.length ? missingSkills : ["No missing skills returned yet."]).map((skill) => (
                      <li key={skill} className="rounded-full border border-ink/15 bg-clay/35 px-3 py-2 text-xs font-black text-ink">
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
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

        <AskAiModal candidateId={candidate.id} candidateName={candidate.name} />
      </div>
    </PageShell>
  );
}
