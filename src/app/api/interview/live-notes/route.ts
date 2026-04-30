import { createServerSupabaseClient } from "@/lib/supabase/server";

type LiveSuggestions = {
  followUpQuestions: string[];
  coveredFollowUpQuestions: string[];
  flags: string[];
  evidenceCaptured: string[];
  meetingNotes: string[];
};

const emptySuggestions: LiveSuggestions = {
  followUpQuestions: [],
  coveredFollowUpQuestions: [],
  flags: [],
  evidenceCaptured: [],
  meetingNotes: []
};

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeSuggestions(value: unknown): LiveSuggestions {
  if (!value || typeof value !== "object") {
    return emptySuggestions;
  }

  const output = value as Partial<Record<keyof LiveSuggestions, unknown>>;

  return {
    followUpQuestions: stringArray(output.followUpQuestions),
    coveredFollowUpQuestions: stringArray(output.coveredFollowUpQuestions),
    flags: stringArray(output.flags),
    evidenceCaptured: stringArray(output.evidenceCaptured),
    meetingNotes: stringArray(output.meetingNotes)
  };
}

function appendUniqueNote(currentNotes: string[], note: string) {
  return currentNotes.includes(note) ? currentNotes : [...currentNotes, note];
}

export async function POST(request: Request) {
  const { meetingNote, sessionId } = (await request.json()) as {
    meetingNote?: string;
    sessionId?: string;
  };
  const trimmedNote = meetingNote?.trim();

  if (!sessionId || !trimmedNote) {
    return Response.json({ error: "sessionId and meetingNote are required." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: session, error: sessionError } = await supabase
    .from("interview_sessions")
    .select("id, ai_interview_output")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    return Response.json({ error: sessionError.message }, { status: 500 });
  }

  if (!session) {
    return Response.json({ error: "Interview session was not found." }, { status: 404 });
  }

  const output = normalizeSuggestions(session.ai_interview_output);
  const nextOutput = {
    ...output,
    meetingNotes: appendUniqueNote(output.meetingNotes, trimmedNote)
  };
  const { error } = await supabase
    .from("interview_sessions")
    .update({ ai_interview_output: nextOutput })
    .eq("id", sessionId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data: nextOutput });
}
