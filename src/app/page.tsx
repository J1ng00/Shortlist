import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, ClipboardList, FileText, MessageSquareText } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { ButtonLink, Card, Pill } from "@/components/ui";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CandidateAiOutput = {
  status?: string;
  ai_summary?: string;
  initial_fit_score?: number;
  extracted_profile?: {
    fullName?: string;
    currentRole?: string;
  };
};

type RecentCandidate = {
  id: string;
  full_name: string;
  current_position: string | null;
  ai_candidate_output: CandidateAiOutput | null;
  initial_fit_score: number | null;
  created_at: string;
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

function normalizeJob(row: RecentCandidate) {
  return Array.isArray(row.jobs) ? row.jobs[0] ?? null : row.jobs;
}

function candidateName(row: RecentCandidate) {
  return row.full_name || row.ai_candidate_output?.extracted_profile?.fullName || "Unnamed candidate";
}

function candidateRole(row: RecentCandidate) {
  return row.current_position || row.ai_candidate_output?.extracted_profile?.currentRole || "Role not provided";
}

function recentCandidateAiScore(row: RecentCandidate) {
  const score = row.initial_fit_score ?? row.ai_candidate_output?.initial_fit_score;

  return typeof score === "number" ? `AI score: ${score}` : "AI score pending";
}

const flow = [
  {
    title: "Create job profile",
    description: "Capture role details, values, skills, and interview focus.",
    href: "/jobs/new",
    icon: BriefcaseBusiness,
  },
  {
    title: "Saved job profiles",
    description: "Review saved roles, open application forms, and manage job cards.",
    href: "/jobs",
    icon: ClipboardList,
  },
  {
    title: "View candidate list",
    description: "Search applicants, review statuses, and open candidate summaries.",
    href: "/candidates",
    icon: FileText,
  },
  {
    title: "Run interview copilot",
    description: "Use candidate evidence to suggest practical follow-up questions.",
    href: "/candidates",
    icon: MessageSquareText,
  },
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createServerSupabaseClient();
  const [{ data: candidates }, { count: jobCount }] = await Promise.all([
    supabase
      .from("candidates")
      .select("id, full_name, current_position, ai_candidate_output, initial_fit_score, created_at, jobs(role_title, business_name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("jobs").select("id", { count: "exact", head: true }),
  ]);
  const recentCandidates = (candidates ?? []) as unknown as RecentCandidate[];
  const readyCount = recentCandidates.filter((candidate) => candidate.ai_candidate_output?.status === "ready").length;

  return (
    <PageShell
      eyebrow="Hiring overview"
      title="Shortlist pipeline"
      description="Track applications across roles and move candidates from submitted to interview-ready."
      actions={
        <>
          <ButtonLink href="/jobs/new">Start job profile</ButtonLink>
          <ButtonLink href="/candidates" variant="secondary">View candidates</ButtonLink>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <section className="animate-shortlist-in rounded-2xl border border-ink/20 bg-paper p-6 shadow-panel transition duration-300 hover:-translate-y-0.5 hover:shadow-strong">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-navy/70">Open roles</p>
              <p className="mt-2 text-4xl font-black text-ink">{jobCount ?? 0}</p>
            </div>
            <span className="h-12 w-2 rounded-full bg-ink" aria-hidden="true" />
          </div>
        </section>
        <section className="animate-shortlist-in rounded-2xl border border-ink/20 bg-paper p-6 shadow-panel transition duration-300 hover:-translate-y-0.5 hover:shadow-strong">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-navy/70">Recent applicants</p>
              <p className="mt-2 text-4xl font-black text-ink">{recentCandidates.length}</p>
            </div>
            <span className="h-12 w-2 rounded-full bg-clay ring-1 ring-ink/20" aria-hidden="true" />
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden rounded-2xl border-ink/25">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="good">{readyCount} analyzed</Pill>
            <Pill>{recentCandidates.length - readyCount} awaiting AI review</Pill>
          </div>
          <h2 className="mt-5 text-3xl font-black text-navy">Core workflow</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {flow.map((step) => {
              const Icon = step.icon;
              return (
                <Link
                  key={step.title}
                  href={step.href}
                  className="shortlist-surface group rounded-2xl border border-ink/20 bg-white p-5 shadow-panel transition duration-300 hover:-translate-y-1 hover:border-ink/35 hover:shadow-strong"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-paper shadow-panel transition group-hover:bg-navy">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-black">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-navy/72">{step.description}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-black text-ink">
                    Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card className="rounded-2xl border-ink/25">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-ink/70">Recent candidates</p>
              <h2 className="mt-1 text-2xl font-black">Applicant activity</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {recentCandidates.length ? (
              recentCandidates.map((candidate) => {
                const job = normalizeJob(candidate);

                return (
                  <Link
                    key={candidate.id}
                    className="block rounded-xl border border-ink/20 bg-white p-4 shadow-[0_1px_0_rgba(60,87,143,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-ink/35 hover:bg-clay/35"
                    href={`/candidates/${candidate.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-navy">{candidateName(candidate)}</p>
                        <p className="mt-1 truncate text-xs font-bold text-navy/60">{candidateRole(candidate)}</p>
                        {job ? (
                          <p className="mt-2 truncate text-xs text-navy/55">
                            {job.role_title} at {job.business_name}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-full border border-ink/20 bg-paper px-3 py-1 text-xs font-black text-ink">
                        {recentCandidateAiScore(candidate)}
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="text-sm leading-6 text-navy/65">No applications yet. Create a role and share its application form.</p>
            )}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
