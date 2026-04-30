import { PageShell } from "@/components/page-shell";
import { LiveInterviewConsole } from "@/components/live-interview-console";
import { ButtonLink, Card } from "@/components/ui";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type LiveInterviewPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    role?: string;
  }>;
};

type CandidateRow = {
  id: string;
  full_name: string;
  current_position: string | null;
  job_id: string;
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

type InterviewSessionRow = {
  id: string;
  created_at: string;
  notes: string;
};

export const dynamic = "force-dynamic";

export default async function LiveInterviewPage({ params, searchParams }: LiveInterviewPageProps) {
  const { id } = await params;
  const { role } = await searchParams;
  const participantRole = role?.toLowerCase() === "candidate" ? "candidate" : "manager";
  const supabase = createServerSupabaseClient();
  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, full_name, current_position, job_id, jobs(role_title, business_name)")
    .eq("id", id)
    .maybeSingle();

  if (!candidate) {
    return (
      <PageShell
        eyebrow="Live interview"
        title="Candidate must be saved first"
        description="Live interview rooms are only available for candidates stored in Supabase. Mock fallback candidates can still use the standard interview copilot page."
        actions={<ButtonLink href={`/candidates/${id}`}>Back to scorecard</ButtonLink>}
      >
        <Card>
          <h2 className="text-2xl font-black">No Supabase candidate found</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">
            This protects the live interview flow from creating sessions for placeholder data. Once candidate upload
            creates a real row, this page can create and join a live room.
          </p>
        </Card>
      </PageShell>
    );
  }

  const candidateRow = candidate as CandidateRow;
  const job = Array.isArray(candidateRow.jobs) ? candidateRow.jobs[0] : candidateRow.jobs;
  const roomName = `interview-${candidateRow.id}`;
  const { data: session } = await supabase
    .from("interview_sessions")
    .select("id, created_at, notes")
    .eq("candidate_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let latestSession = session as InterviewSessionRow | null;

  if (!latestSession) {
    const { data: newSession } = await supabase
      .from("interview_sessions")
      .insert({
        candidate_id: candidateRow.id,
        notes: "",
        ai_interview_output: {},
        final_decision_output: {}
      })
      .select("id, created_at, notes")
      .single();

    latestSession = newSession as InterviewSessionRow | null;
  }

  return (
    <PageShell
      eyebrow="Live interview"
      focused
      title={
        participantRole === "candidate"
          ? `${candidateRow.full_name} interview room`
          : `${candidateRow.full_name} live room`
      }
      description={
        participantRole === "candidate"
          ? "Join the interview room with camera and mic. Your speech is transcribed as the candidate for this demo."
          : "Manager view for the live interview room, transcript capture, and AI copilot workspace."
      }
      actions={
        <>
          <ButtonLink href={`/candidates/${candidateRow.id}`} variant="secondary">
            Back to scorecard
          </ButtonLink>
          <ButtonLink href={`/interview/${candidateRow.id}`}>Classic copilot</ButtonLink>
        </>
      }
    >
      <LiveInterviewConsole
        candidateId={candidateRow.id}
        candidateName={candidateRow.full_name}
        companyName={job?.business_name ?? "Unknown company"}
        initialNotes={latestSession?.notes ?? ""}
        latestSessionId={latestSession?.id}
        participantRole={participantRole}
        roleTitle={job?.role_title ?? "Unknown role"}
        roomName={roomName}
      />
    </PageShell>
  );
}
