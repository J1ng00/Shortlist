import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, ClipboardList, FileText, MessageSquareText, Search, Stamp } from "lucide-react";

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
  return row.ai_candidate_output?.extracted_profile?.fullName || row.full_name;
}

function candidateRole(row: RecentCandidate) {
  return row.ai_candidate_output?.extracted_profile?.currentRole || row.current_position || "Role not provided";
}

function candidateScore(row: RecentCandidate) {
  return row.ai_candidate_output?.initial_fit_score ?? row.initial_fit_score;
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
    title: "Review pipeline",
    description: "Search applicants, compare fit scores, and open candidate summaries.",
    href: "/candidates",
    icon: FileText,
  },
  {
    title: "Run interview copilot",
    description: "Use candidate evidence to suggest practical follow-up questions.",
    href: "/candidates",
    icon: MessageSquareText,
  },
  {
    title: "Generate memo",
    description: "Produce a concise recommendation managers can act on.",
    href: "/candidates",
    icon: Stamp,
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
      description="Track applications across roles, review AI fit scores, and move candidates from submitted to interview-ready."
      actions={
        <>
          <ButtonLink href="/jobs/new">Start job profile</ButtonLink>
          <ButtonLink href="/candidates" variant="secondary">View candidates</ButtonLink>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl">
          <p className="text-sm font-bold text-navy/60">Open roles</p>
          <p className="mt-2 text-3xl font-black text-ink">{jobCount ?? 0}</p>
        </Card>
        <Card className="rounded-2xl">
          <p className="text-sm font-bold text-navy/60">Recent applicants</p>
          <p className="mt-2 text-3xl font-black text-ink">{recentCandidates.length}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="good">{readyCount} analyzed</Pill>
            <Pill>{recentCandidates.length - readyCount} awaiting AI review</Pill>
            <Pill>No auth MVP</Pill>
          </div>
          <h2 className="mt-5 text-3xl font-black tracking-tight">Core workflow</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {flow.map((step) => {
              const Icon = step.icon;
              return (
                <Link
                  key={step.title}
                  href={step.href}
                  className="group rounded-2xl border border-ink/10 bg-white/60 p-5 transition hover:-translate-y-0.5 hover:border-clay/40 hover:shadow-soft"
                >
                  <Icon className="h-7 w-7 text-clay" />
                  <h3 className="mt-4 text-lg font-black">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/60">{step.description}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-moss">
                    Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card className="rounded-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-ink/60">Recent candidates</p>
              <h2 className="mt-1 text-2xl font-black">Applicant activity</h2>
            </div>
            <ButtonLink href="/candidates" variant="secondary">
              <Search className="h-4 w-4" />
              Search
            </ButtonLink>
          </div>
          <div className="mt-5 space-y-3">
            {recentCandidates.length ? (
              recentCandidates.map((candidate) => {
                const job = normalizeJob(candidate);
                const score = candidateScore(candidate);

                return (
                  <Link
                    key={candidate.id}
                    className="block rounded-xl border border-line bg-white p-4 transition hover:border-ink/30 hover:bg-moss/10"
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
                      <span className="shrink-0 rounded-full bg-ink px-3 py-1 text-xs font-black text-paper">
                        {score ?? "--"}
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
