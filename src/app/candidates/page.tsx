import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Github, Linkedin, Search, Sparkles, UserRound } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { ButtonLink, Card, Pill } from "@/components/ui";
import { ActionSubmitButton } from "@/components/candidates/action-submit-button";
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
  stage: "review" | "interview" | "decision";
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
  return row.ai_candidate_output?.extracted_profile?.fullName || row.full_name;
}

function candidateRole(row: CandidateRow) {
  return row.ai_candidate_output?.extracted_profile?.currentRole || row.current_position || "Role not provided";
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
  const averageScore = rows.length
    ? Math.round(rows.reduce((total, row) => total + (candidateScore(row) ?? 0), 0) / rows.length)
    : 0;

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
          <p className="text-sm font-bold text-navy/60">Average AI fit</p>
          <p className="mt-2 text-3xl font-black text-ink">{averageScore}/100</p>
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
            <option value="decision">Decision</option>
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
            const score = candidateScore(row);
            const skills = candidateSkills(row);
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
                      <Pill>{row.ai_candidate_output?.hr_decision?.label ?? row.stage}</Pill>
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
                          <p className="mt-2 inline-flex items-center gap-2 text-sm text-navy/60">
                            <BriefcaseBusiness className="h-4 w-4" />
                            {job.role_title} at {job.business_name}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-navy/70">
                      {row.ai_candidate_output?.recommendation_headline || row.ai_candidate_output?.ai_summary || row.ai_candidate_output?.submitted_application?.manual_profile_notes || "Application received. Run AI analysis to generate a role-specific overview and fit score."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {skills.slice(0, 6).map((skill) => (
                        <Pill key={skill}>{skill}</Pill>
                      ))}
                    </div>

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
                    <p className="text-xs font-black uppercase text-navy/55">AI fit score</p>
                    <p className="mt-2 text-3xl font-black text-ink">{score ?? "--"}{score == null ? "" : "/100"}</p>
                    <div className="mt-3 h-2 rounded-full bg-sand">
                      <div className="h-2 rounded-full bg-ink" style={{ width: `${score ?? 0}%` }} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <ButtonLink href={`/candidates/${row.id}`} variant="secondary">Open</ButtonLink>
                      {status !== "ready" && row.resume_text ? (
                        <form action={analyzeCandidate}>
                          <input name="candidate_id" type="hidden" value={row.id} />
                          <ActionSubmitButton pendingLabel="Analyzing...">
                            <Sparkles className="h-4 w-4" />
                            Analyze
                          </ActionSubmitButton>
                        </form>
                      ) : null}
                    </div>
                    <div className="mt-4 grid gap-2">
                      <form action={updateCandidateDecision}>
                        <input name="candidate_id" type="hidden" value={row.id} />
                        <input name="outcome" type="hidden" value="next_stage" />
                        <ActionSubmitButton pendingLabel="Updating..." variant="secondary">Next stage</ActionSubmitButton>
                      </form>
                      <form action={updateCandidateDecision}>
                        <input name="candidate_id" type="hidden" value={row.id} />
                        <input name="outcome" type="hidden" value="rejected" />
                        <ActionSubmitButton pendingLabel="Updating..." variant="danger">Reject</ActionSubmitButton>
                      </form>
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
