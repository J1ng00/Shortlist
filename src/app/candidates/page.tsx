import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, CalendarClock, Github, Linkedin, Search, Sparkles, UserRound } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { ButtonLink, Card, Pill } from "@/components/ui";
import { ActionSubmitButton } from "@/components/candidates/action-submit-button";
import { ScheduleInterviewModal } from "@/components/candidates/schedule-interview-modal";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { analyzeCandidate, updateCandidateDecision } from "./[id]/actions";

type CandidatesPageProps = {
  searchParams: Promise<{
    q?: string;
    stage?: string;
  }>;
};

type CandidateAiOutput = {
  status?: string;
  ai_summary?: string;
  initial_fit_score?: number;
  extracted_profile?: {
    fullName?: string;
    currentRole?: string;
    location?: string;
    extractedSkills?: string[];
  };
  extracted_skills?: string[];
  strengths?: string[];
  missing_requirements?: string[];
  skill_match?: {
    matched?: string[];
    partial?: string[];
    missing?: string[];
  };
  recommendation?: "hire" | "progress" | "hold" | "reject";
  recommendation_headline?: string;
  recommendation_reason?: string;
  next_best_action?: string;
  hr_decision?: {
    outcome?: string;
    label?: string;
    note?: string | null;
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
};

type CandidateRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  current_position: string | null;
  github_url: string | null;
  resume_text: string | null;
  ai_candidate_output: CandidateAiOutput | null;
  initial_fit_score: number | null;
  stage: "review" | "interview" | "reject" | "hired";
  created_at: string;
  jobs:
    | {
        id: string;
        role_title: string;
        business_name: string;
        location: string | null;
      }
    | Array<{
        id: string;
        role_title: string;
        business_name: string;
        location: string | null;
      }>
    | null;
};

function normalizeJob(row: CandidateRow) {
  return Array.isArray(row.jobs) ? row.jobs[0] ?? null : row.jobs;
}

function candidateName(row: CandidateRow) {
  return row.full_name || row.ai_candidate_output?.extracted_profile?.fullName || "Unnamed candidate";
}

function candidateRole(row: CandidateRow) {
  return row.current_position || row.ai_candidate_output?.extracted_profile?.currentRole || "Role not provided";
}

function candidateScore(row: CandidateRow) {
  return row.ai_candidate_output?.initial_fit_score ?? row.initial_fit_score;
}

function candidateSkills(row: CandidateRow) {
  return row.ai_candidate_output?.extracted_skills ?? row.ai_candidate_output?.extracted_profile?.extractedSkills ?? [];
}

function candidateStatus(row: CandidateRow) {
  return row.ai_candidate_output?.status ?? "submitted";
}

function recommendationLabel(row: CandidateRow) {
  const recommendation = row.ai_candidate_output?.recommendation;

  if (recommendation === "hire") {
    return "Hire";
  }

  if (recommendation === "progress") {
    return "Progress";
  }

  if (recommendation === "reject") {
    return "Do not progress";
  }

  if (recommendation === "hold") {
    return "Hold";
  }

  return "Awaiting AI";
}

function scheduledInterviewLabel(row: CandidateRow) {
  const date = row.ai_candidate_output?.hr_decision?.interview_date;
  const time = row.ai_candidate_output?.hr_decision?.interview_time;

  if (!date || !time) {
    return null;
  }

  const scheduledAt = new Date(`${date}T${time}`);

  if (Number.isNaN(scheduledAt.getTime())) {
    return `Interview scheduled for ${date} at ${time}`;
  }

  return `Interview scheduled for ${scheduledAt.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} at ${scheduledAt.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function processRecommendation(row: CandidateRow) {
  const output = row.ai_candidate_output;
  const scheduledInterview = scheduledInterviewLabel(row);
  const score = candidateScore(row);
  const summary = output?.ai_summary || output?.submitted_application?.manual_profile_notes;

  if (output?.hr_decision?.outcome === "rejected") {
    return output.hr_decision.note ?? "Decision made: candidate has been rejected.";
  }

  if (output?.hr_decision?.outcome === "hired") {
    return output.hr_decision.note ?? "Decision made: candidate is marked for hire.";
  }

  if (output?.interview_summary) {
    return output.interview_summary.nextStep
      ? `Interview complete. Recommended action: ${output.interview_summary.nextStep}`
      : "Interview complete. Review the interview summary before making the final decision.";
  }

  if (row.stage === "interview" || output?.hr_decision?.outcome === "next_stage") {
    return scheduledInterview
      ? `Interview scheduled. Recommended action: run the interview, then record the interview summary.`
      : "Candidate is in interview stage. Recommended action: schedule an interview or start the interview copilot.";
  }

  if (candidateStatus(row) !== "ready") {
    return "Awaiting AI analysis. Recommended action: analyze fit before deciding.";
  }

  if (output?.recommendation === "reject" || (score != null && score < 60)) {
    return output?.recommendation_reason
      ? `Recommended action: validate the gaps before rejecting or keeping in review. ${output.recommendation_reason}`
      : "Recommended action: validate the gaps before rejecting or keeping in review.";
  }

  return output?.next_best_action
    ? `Recommended action: ${output.next_best_action}`
    : output?.recommendation_headline || summary || "Recommended action: review the evidence and choose whether to progress to interview.";
}

function matchesSearch(row: CandidateRow, query: string) {
  if (!query) {
    return true;
  }

  const job = normalizeJob(row);
  const output = row.ai_candidate_output;
  const haystack = [
    candidateName(row),
    candidateRole(row),
    row.email,
    row.phone,
    row.github_url,
    output?.submitted_application?.linkedin_url,
    output?.submitted_application?.manual_profile_notes,
    output?.ai_summary,
    job?.role_title,
    job?.business_name,
    ...(candidateSkills(row) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function stageTone(status: string): "good" | "warn" | "neutral" {
  if (status === "ready") {
    return "good";
  }

  if (status === "failed") {
    return "warn";
  }

  return "neutral";
}

function displayStatus(row: CandidateRow) {
  const outcome = row.ai_candidate_output?.hr_decision?.outcome;

  if (outcome === "rejected" || row.stage === "reject") {
    return "reject";
  }

  if (outcome === "hired" || row.stage === "hired") {
    return "hired";
  }

  return row.stage;
}

function statusClassName(status: string) {
  if (status === "hired") {
    return "border-emerald-300 bg-emerald-50 text-emerald-800";
  }

  if (status === "reject") {
    return "border-red-300 bg-red-50 text-red-700";
  }

  if (status === "interview") {
    return "border-ink/20 bg-moss/35 text-ink";
  }

  return "border-ink/20 bg-white text-ink";
}

export const dynamic = "force-dynamic";

export default async function CandidatesPage({ searchParams }: CandidatesPageProps) {
  const { q = "", stage = "all" } = await searchParams;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("candidates")
    .select("id, full_name, email, phone, current_position, github_url, resume_text, ai_candidate_output, initial_fit_score, stage, created_at, jobs(id, role_title, business_name, location)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as CandidateRow[];
  const filtered = rows.filter((row) => {
    const stageMatch = stage === "all" || row.stage === stage;
    return stageMatch && matchesSearch(row, q);
  });
  const readyCount = rows.filter((row) => candidateStatus(row) === "ready").length;
  const interviewCount = rows.filter((row) => displayStatus(row) === "interview").length;

  return (
    <PageShell
      eyebrow="Candidates"
      title="Candidate pipeline"
      description="Review every submitted applicant, search across roles and profile details, and run AI fit analysis against each job profile."
      actions={
        <>
          <ButtonLink href="/jobs">Saved roles</ButtonLink>
          <ButtonLink href="/candidates/new" variant="secondary">Add internally</ButtonLink>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl">
          <p className="text-sm font-bold text-navy/60">Total candidates</p>
          <p className="mt-2 text-3xl font-black text-ink">{rows.length}</p>
        </Card>
        <Card className="rounded-2xl">
          <p className="text-sm font-bold text-navy/60">Ready for review</p>
          <p className="mt-2 text-3xl font-black text-ink">{readyCount}</p>
        </Card>
        <Card className="rounded-2xl">
          <p className="text-sm font-bold text-navy/60">Interview stage</p>
          <p className="mt-2 text-3xl font-black text-ink">{interviewCount}</p>
        </Card>
      </div>

      <Card className="mt-6 rounded-2xl">
        <form className="grid gap-3 md:grid-cols-[1fr_180px_auto]" action="/candidates">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/45" />
            <input
              className="h-12 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-sm font-bold outline-none focus:border-ink"
              defaultValue={q}
              name="q"
              placeholder="Search name, role, skill, company, email..."
            />
          </label>
          <select
            className="h-12 rounded-xl border border-line bg-white px-4 text-sm font-bold outline-none focus:border-ink"
            defaultValue={stage}
            name="stage"
          >
            <option value="all">All stages</option>
            <option value="review">Review</option>
            <option value="interview">Interview</option>
            <option value="reject">Rejected</option>
            <option value="hired">Hired</option>
          </select>
          <button className="h-12 rounded-xl bg-ink px-5 text-sm font-black text-paper" type="submit">
            Search
          </button>
        </form>
      </Card>

      <div className="mt-6 grid gap-4">
        {filtered.length ? (
          filtered.map((row) => {
            const job = normalizeJob(row);
            const status = candidateStatus(row);
            const interviewSummary = row.ai_candidate_output?.interview_summary;
            const scheduledInterview = scheduledInterviewLabel(row);
            const currentRecommendation = processRecommendation(row);
            const statusLabel = displayStatus(row);
            const isRejected = statusLabel === "reject";
            const isHired = statusLabel === "hired";
            const links = {
              github: row.github_url ?? row.ai_candidate_output?.submitted_application?.github_url,
              linkedin: row.ai_candidate_output?.submitted_application?.linkedin_url,
            };

            return (
              <Card key={row.id} className="rounded-2xl">
                <div className="grid gap-5 xl:grid-cols-[1fr_220px] xl:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={stageTone(status)}>{status === "ready" ? "AI analyzed" : status}</Pill>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClassName(statusLabel)}`}>
                        {statusLabel}
                      </span>
                      <Pill>{recommendationLabel(row)}</Pill>
                      {job ? <Pill>{job.role_title}</Pill> : null}
                    </div>

                    <div className="mt-4 flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-moss/20 text-ink">
                        <UserRound className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <Link href={`/candidates/${row.id}`} className="group inline-flex max-w-full items-center gap-2">
                          <h2 className="truncate text-2xl font-black text-navy group-hover:text-ink">{candidateName(row)}</h2>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-ink" />
                        </Link>
                        <p className="mt-1 text-sm font-bold text-navy/65">{candidateRole(row)}</p>
                        {job ? (
                          <p className="mt-2 flex items-center gap-2 text-sm text-navy/60">
                            <BriefcaseBusiness className="h-4 w-4 shrink-0" />
                            <span>{job.role_title} at {job.business_name}</span>
                          </p>
                        ) : null}
                        {scheduledInterview ? (
                          <p className="mt-3 flex w-fit items-center gap-2 rounded-full bg-moss/15 px-3 py-1 text-sm font-bold text-ink">
                            <CalendarClock className="h-4 w-4 shrink-0" />
                            {scheduledInterview}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-navy/70">
                      {currentRecommendation}
                    </p>

                    {interviewSummary ? (
                      <div className="mt-4 rounded-2xl border border-moss/25 bg-moss/10 p-4">
                        <p className="text-xs font-black uppercase text-ink">Interview summary</p>
                        <h3 className="mt-2 text-base font-black text-navy">
                          {interviewSummary.headline ?? "Interview completed"}
                        </h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-navy/70">
                          {interviewSummary.summary ?? "Interview summary has been saved."}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold text-ink">
                      {links.github ? (
                        <a className="inline-flex items-center gap-2 hover:text-moss" href={links.github} rel="noreferrer" target="_blank">
                          <Github className="h-4 w-4" />
                          GitHub
                        </a>
                      ) : null}
                      {links.linkedin ? (
                        <a className="inline-flex items-center gap-2 hover:text-moss" href={links.linkedin} rel="noreferrer" target="_blank">
                          <Linkedin className="h-4 w-4" />
                          LinkedIn
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-white p-4">
                    <p className="text-xs font-black uppercase text-navy/55">Status</p>
                    <p className="mt-2 text-2xl font-black capitalize text-ink">{statusLabel}</p>
                    <div className="mt-4 grid gap-2">
                      <Link
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink/20 bg-paper px-5 py-3 text-sm font-bold text-ink transition hover:border-ink/30"
                        href={`/candidates/${row.id}`}
                      >
                        Open
                      </Link>
                      {status !== "ready" && row.resume_text && !isRejected && !isHired ? (
                        <form action={analyzeCandidate}>
                          <input name="candidate_id" type="hidden" value={row.id} />
                          <ActionSubmitButton fullWidth pendingLabel="Analyzing...">
                            <Sparkles className="h-4 w-4" />
                            Analyze
                          </ActionSubmitButton>
                        </form>
                      ) : null}
                    </div>
                    <div className="mt-4 grid gap-2">
                      {!isRejected && !isHired ? (
                        <>
                          <ScheduleInterviewModal
                            action={updateCandidateDecision}
                            candidateId={row.id}
                            fullWidth
                            label={interviewSummary ? "Schedule another interview" : "Next stage"}
                            variant="secondary"
                          />
                          <form action={updateCandidateDecision}>
                            <input name="candidate_id" type="hidden" value={row.id} />
                            <input name="outcome" type="hidden" value="hired" />
                            <ActionSubmitButton fullWidth pendingLabel="Updating...">Hire</ActionSubmitButton>
                          </form>
                          <form action={updateCandidateDecision}>
                            <input name="candidate_id" type="hidden" value={row.id} />
                            <input name="outcome" type="hidden" value="reject" />
                            <ActionSubmitButton fullWidth pendingLabel="Updating..." variant="danger">Reject</ActionSubmitButton>
                          </form>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="rounded-2xl">
            <h2 className="text-2xl font-black">No candidates found</h2>
            <p className="mt-2 text-sm leading-6 text-navy/65">
              Adjust the search, or share an application form from a saved role.
            </p>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
