import Link from "next/link";
import { ChevronLeft } from "lucide-react";

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
  ai_candidate_output: unknown;
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
  ai_interview_output: unknown;
  notes: string;
};

type CandidateAiOutput = {
  hr_decision?: {
    interview_date?: string | null;
    interview_time?: string | null;
  };
  suggested_interview_questions?: unknown;
  suggested_screening_questions?: unknown;
};

type InterviewAiOutput = {
  followUpQuestions?: unknown;
};

export const dynamic = "force-dynamic";

const fallbackFollowUpQuestions = [
  "Can you walk me through a specific example from your recent work?",
  "What was your direct responsibility, and what measurable result came from it?",
  "What tradeoffs did you consider, and what would you do differently now?"
];

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

function screeningQuestionArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item && typeof item === "object" && "question" in item && typeof item.question === "string") {
        return item.question;
      }

      return null;
    })
    .filter((item): item is string => Boolean(item?.trim()));
}

function uniqueQuestions(questions: string[]) {
  const seenQuestions = new Set<string>();
  const nextQuestions: string[] = [];

  for (const question of questions) {
    const trimmedQuestion = question.trim();

    if (trimmedQuestion && !seenQuestions.has(trimmedQuestion)) {
      seenQuestions.add(trimmedQuestion);
      nextQuestions.push(trimmedQuestion);
    }
  }

  return nextQuestions;
}

function getInitialFollowUpQuestions(sessionOutput: unknown, candidateOutput: unknown) {
  const interviewOutput = (sessionOutput ?? {}) as InterviewAiOutput;
  const candidateAiOutput = (candidateOutput ?? {}) as CandidateAiOutput;
  const savedFollowUps = stringArray(interviewOutput.followUpQuestions);

  if (savedFollowUps.length > 0) {
    return uniqueQuestions(savedFollowUps);
  }

  const suggestedInterviewQuestions = stringArray(candidateAiOutput.suggested_interview_questions);

  if (suggestedInterviewQuestions.length > 0) {
    return uniqueQuestions(suggestedInterviewQuestions);
  }

  const suggestedScreeningQuestions = screeningQuestionArray(candidateAiOutput.suggested_screening_questions);

  if (suggestedScreeningQuestions.length > 0) {
    return uniqueQuestions(suggestedScreeningQuestions);
  }

  return fallbackFollowUpQuestions;
}

function getScheduledInterviewLabel(candidateOutput: unknown) {
  const candidateAiOutput = (candidateOutput ?? {}) as CandidateAiOutput;
  const date = candidateAiOutput.hr_decision?.interview_date;
  const time = candidateAiOutput.hr_decision?.interview_time;

  if (!date || !time) {
    return null;
  }

  const scheduledAt = new Date(`${date}T${time}`);

  if (Number.isNaN(scheduledAt.getTime())) {
    return `${date} ${time}`;
  }

  return scheduledAt.toLocaleString("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short"
  });
}

export default async function LiveInterviewPage({ params, searchParams }: LiveInterviewPageProps) {
  const { id } = await params;
  const { role } = await searchParams;
  const participantRole = role?.toLowerCase() === "candidate" ? "candidate" : "manager";
  const supabase = createServerSupabaseClient();
  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, full_name, current_position, ai_candidate_output, job_id, jobs(role_title, business_name)")
    .eq("id", id)
    .maybeSingle();

  if (!candidate) {
    return (
      <PageShell
        eyebrow="Live interview"
        title="Candidate must be saved first"
        description="Live interview rooms are only available for candidates stored in Supabase."
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
  const roleTitle = job?.role_title ?? "Unknown role";
  const companyName = job?.business_name ?? "Unknown company";
  const scheduledInterview = getScheduledInterviewLabel(candidateRow.ai_candidate_output);
  const managerDescription = [
    `Role: ${roleTitle}`,
    `Company: ${companyName}`,
    scheduledInterview ? `Scheduled: ${scheduledInterview}` : null
  ]
    .filter((item): item is string => Boolean(item))
    .join(" · ");
  const roomName = `interview-${candidateRow.id}`;
  const { data: session } = await supabase
    .from("interview_sessions")
    .select("id, created_at, notes, ai_interview_output")
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
      .select("id, created_at, notes, ai_interview_output")
      .single();

    latestSession = newSession as InterviewSessionRow | null;
  }
  const initialFollowUpQuestions = getInitialFollowUpQuestions(
    latestSession?.ai_interview_output,
    candidateRow.ai_candidate_output
  );

  return (
    <PageShell
      backAction={
        <Link
          aria-label="Back to scorecard"
          className="inline-flex h-6 w-6 items-center justify-center text-ink/70 transition hover:text-ink"
          href={`/candidates/${candidateRow.id}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      }
      eyebrow="Live interview"
      focused
      title={
        participantRole === "candidate"
          ? `${candidateRow.full_name} interview room`
          : `${candidateRow.full_name} live room`
      }
      description={
        participantRole === "candidate"
          ? `Interview room for ${roleTitle} at ${companyName}. Your speech is transcribed as the candidate for this demo.`
          : managerDescription
      }
    >
      <LiveInterviewConsole
        candidateId={candidateRow.id}
        candidateName={candidateRow.full_name}
        initialNotes={latestSession?.notes ?? ""}
        initialSuggestions={{
          coveredFollowUpQuestions: [],
          evidenceCaptured: [],
          flags: [],
          followUpQuestions: initialFollowUpQuestions,
          meetingNotes: []
        }}
        latestSessionId={latestSession?.id}
        participantRole={participantRole}
        roomName={roomName}
      />
    </PageShell>
  );
}
