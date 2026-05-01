import OpenAI from "openai";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type LiveSuggestions = {
  followUpQuestions: string[];
  coveredFollowUpQuestions: string[];
  flags: string[];
  evidenceCaptured: string[];
  meetingNotes: string[];
};

type CandidateAiOutput = {
  ai_summary?: string;
  interview_summary?: unknown;
  interview_summary_count?: number;
  strengths?: string[];
  missing_requirements?: string[];
  areas_to_validate?: string[];
  suggested_interview_questions?: string[];
  suggested_screening_questions?: Array<string | { question?: string; reason?: string }>;
  initial_fit_score?: number;
  extracted_skills?: string[];
  skill_match?: unknown;
};

const liveSuggestionsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["followUpQuestions", "coveredFollowUpQuestions", "flags", "evidenceCaptured", "meetingNotes"],
  properties: {
    followUpQuestions: { type: "array", items: { type: "string" } },
    coveredFollowUpQuestions: { type: "array", items: { type: "string" } },
    flags: { type: "array", items: { type: "string" } },
    evidenceCaptured: { type: "array", items: { type: "string" } },
    meetingNotes: { type: "array", items: { type: "string" } }
  }
};

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mergeUniqueItems(currentItems: string[], incomingItems: string[] | undefined) {
  const mergedItems = [...currentItems];
  const seenItems = new Set(currentItems);

  for (const item of incomingItems ?? []) {
    const trimmedItem = item.trim();

    if (trimmedItem && !seenItems.has(trimmedItem)) {
      mergedItems.push(trimmedItem);
      seenItems.add(trimmedItem);
    }
  }

  return mergedItems;
}

function normalizeSuggestions(value: unknown): LiveSuggestions {
  if (!value || typeof value !== "object") {
    return {
      followUpQuestions: [],
      coveredFollowUpQuestions: [],
      flags: [],
      evidenceCaptured: [],
      meetingNotes: []
    };
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

function mergeSuggestions(currentSuggestions: LiveSuggestions, incomingSuggestions: LiveSuggestions): LiveSuggestions {
  return {
    followUpQuestions: mergeUniqueItems(currentSuggestions.followUpQuestions, incomingSuggestions.followUpQuestions),
    coveredFollowUpQuestions: mergeUniqueItems(
      currentSuggestions.coveredFollowUpQuestions,
      incomingSuggestions.coveredFollowUpQuestions
    ),
    flags: mergeUniqueItems(currentSuggestions.flags, incomingSuggestions.flags),
    evidenceCaptured: mergeUniqueItems(currentSuggestions.evidenceCaptured, incomingSuggestions.evidenceCaptured),
    meetingNotes: mergeUniqueItems(currentSuggestions.meetingNotes, incomingSuggestions.meetingNotes)
  };
}

function parseTranscriptBySpeaker(notes: string) {
  const managerLines: string[] = [];
  const candidateLines: string[] = [];

  for (const line of notes.split("\n")) {
    const match = line.match(/^\[(.+?)]\s+(Manager|Candidate):\s+(.+)$/);

    if (!match) {
      continue;
    }

    const [, , speaker, text] = match;
    const trimmedText = text.trim();

    if (!trimmedText) {
      continue;
    }

    if (speaker === "Manager") {
      managerLines.push(trimmedText);
    } else {
      candidateLines.push(trimmedText);
    }
  }

  return { candidateLines, managerLines };
}

function isPrepOrFutureActionNote(note: string) {
  return /^(ask|assess|check|confirm|ensure|follow up|look for|probe|review|validate|verify)\b/i.test(note.trim());
}

function liveMeetingNotesOnly(notes: string[]) {
  return notes.filter((note) => note.trim() && !isPrepOrFutureActionNote(note));
}

function questionArray(value: CandidateAiOutput["suggested_screening_questions"]) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      return item.reason ? `${item.question ?? "Question"} - ${item.reason}` : item.question;
    })
    .filter((item): item is string => Boolean(item));
}

function fallbackFromContext({
  candidateOutput,
  candidateTranscriptLines,
  existingMeetingNotes,
  notes
}: {
  candidateOutput: CandidateAiOutput;
  candidateTranscriptLines: string[];
  existingMeetingNotes: string[];
  notes: string;
}): LiveSuggestions {
  const suggestedQuestions = [
    ...stringArray(candidateOutput.suggested_interview_questions),
    ...questionArray(candidateOutput.suggested_screening_questions)
  ];
  const missingRequirements = stringArray(candidateOutput.missing_requirements);
  const latestCandidateLine = candidateTranscriptLines.at(-1);

  return {
    followUpQuestions: suggestedQuestions.slice(0, 3).length
      ? suggestedQuestions.slice(0, 3)
      : [
          "Can you walk me through a specific example from your recent work?",
          "What was your direct responsibility, and what measurable result came from it?"
        ],
    coveredFollowUpQuestions: [],
    flags: missingRequirements.slice(0, 3).length
      ? missingRequirements.slice(0, 3)
      : ["No clear risk has been confirmed yet. Keep probing for concrete evidence."],
    evidenceCaptured: notes.trim()
      ? ["Live transcript is available. Check whether answers include scope, action, and outcome."]
      : ["No live transcript captured yet."],
    meetingNotes: latestCandidateLine
      ? mergeUniqueItems(existingMeetingNotes, [`Candidate said: ${latestCandidateLine}`])
      : existingMeetingNotes
  };
}

function interviewSummaryFromSuggestions(data: LiveSuggestions, notes: string) {
  const { candidateLines } = parseTranscriptBySpeaker(notes);
  const meetingNotes = liveMeetingNotesOnly(data.meetingNotes);
  const candidateTranscriptLineCount = candidateLines.length;
  const meetingNoteCount = meetingNotes.length;
  const nextStep = data.flags.length
    ? "Review the highlighted concerns before deciding whether to progress."
    : "Review the interview notes and decide whether to progress, reject, or schedule another interview.";

  if (candidateTranscriptLineCount === 0 && meetingNoteCount === 0) {
    return null;
  }

  return {
    headline: "Interview transcript reviewed",
    summary: meetingNotes.length
      ? meetingNotes.slice(0, 3).join(" ")
      : "Live transcript has been captured. Review the saved notes before making a final decision.",
    strengths: data.evidenceCaptured.slice(0, 4),
    concerns: data.flags.slice(0, 4),
    nextStep,
    finalizedAt: new Date().toISOString(),
    source: "live_interview",
    candidateTranscriptLineCount,
    meetingNoteCount
  };
}

function currentInterviewSummaryCount(candidateOutput: CandidateAiOutput) {
  if (typeof candidateOutput.interview_summary_count === "number" && candidateOutput.interview_summary_count > 0) {
    return candidateOutput.interview_summary_count;
  }

  return candidateOutput.interview_summary ? 1 : 0;
}

async function saveInterviewSummary({
  candidateId,
  candidateOutput,
  data,
  notes,
  supabase
}: {
  candidateId: string;
  candidateOutput: CandidateAiOutput;
  data: LiveSuggestions;
  notes: string;
  supabase: ReturnType<typeof createServerSupabaseClient>;
}) {
  const interviewSummary = interviewSummaryFromSuggestions(data, notes);

  if (!interviewSummary) {
    return;
  }

  await supabase
    .from("candidates")
    .update({
      ai_candidate_output: {
        ...candidateOutput,
        interview_summary: interviewSummary,
        interview_summary_count: currentInterviewSummaryCount(candidateOutput) + 1
      },
      updated_at: new Date().toISOString()
    })
    .eq("id", candidateId);
}

export async function POST(request: Request) {
  const { candidateId, sessionId } = (await request.json()) as {
    candidateId?: string;
    sessionId?: string;
  };

  if (!candidateId || !sessionId) {
    return Response.json({ error: "candidateId and sessionId are required." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const [{ data: session, error: sessionError }, { data: candidate, error: candidateError }] = await Promise.all([
    supabase.from("interview_sessions").select("id, notes, ai_interview_output").eq("id", sessionId).maybeSingle(),
    supabase
      .from("candidates")
      .select(
        "id, full_name, current_position, ai_candidate_output, initial_fit_score, jobs(role_title, business_name, company_values, must_have_skills, nice_to_have_skills, interview_focus, ai_job_output)"
      )
      .eq("id", candidateId)
      .maybeSingle()
  ]);

  if (sessionError || candidateError) {
    return Response.json({ error: "Unable to load interview context." }, { status: 500 });
  }

  if (!session || !candidate) {
    return Response.json({ error: "Interview session or candidate was not found." }, { status: 404 });
  }

  const notes = typeof session.notes === "string" ? session.notes : "";
  const transcriptBySpeaker = parseTranscriptBySpeaker(notes);
  const candidateOutput = (candidate.ai_candidate_output ?? {}) as CandidateAiOutput;
  const existingSuggestions = normalizeSuggestions(session.ai_interview_output);
  const existingLiveMeetingNotes = liveMeetingNotesOnly(existingSuggestions.meetingNotes);
  const liveSuggestionsBase = {
    ...existingSuggestions,
    meetingNotes: existingLiveMeetingNotes
  };
  const fallback = mergeSuggestions(
    liveSuggestionsBase,
    fallbackFromContext({
      candidateOutput,
      candidateTranscriptLines: transcriptBySpeaker.candidateLines,
      existingMeetingNotes: existingLiveMeetingNotes,
      notes
    })
  );
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    await saveInterviewSummary({
      candidateId,
      candidateOutput,
      data: fallback,
      notes,
      supabase
    });

    return Response.json({ data: fallback, source: "fallback", error: "Missing OPENAI_API_KEY." });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5.4",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are a live interview copilot for SME hiring managers. Give concise, evidence-based follow-up suggestions from the transcript. Compare the transcript against the suggested follow-up questions and identify questions that have already been answered or substantially covered. flags must include concerning, weak, unclear, contradictory, vague, unsupported, or risky candidate answers from the live interview as concise evidence items. Do not hide concerns only in meetingNotes. meetingNotes must summarize actual live interview content only, especially candidate answers, and should stay neutral. If a candidate answer is concerning, weak, unclear, contradictory, vague, unsupported, or risky, it may also be mentioned neutrally in meetingNotes, but it must appear as a concise item in flags. Do not put reminders, future actions, areas to validate, or prep notes in meetingNotes. If there are no candidate transcript lines and no existing meeting notes, return meetingNotes as an empty array. Human manager stays in control. Avoid culture fit language; use values alignment or working style alignment. Do not use auto-rejection language. Return only structured JSON."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                liveTranscript: notes,
                transcriptBySpeaker,
                existingSuggestions: liveSuggestionsBase,
                existingMeetingNotes: existingLiveMeetingNotes,
                candidate: {
                  name: candidate.full_name,
                  currentPosition: candidate.current_position,
                  fitScore: candidateOutput.initial_fit_score ?? candidate.initial_fit_score,
                  summary: candidateOutput.ai_summary,
                  strengths: candidateOutput.strengths,
                  missingRequirements: candidateOutput.missing_requirements,
                  areasToValidate: candidateOutput.areas_to_validate,
                  suggestedQuestions: [
                    ...stringArray(candidateOutput.suggested_interview_questions),
                    ...questionArray(candidateOutput.suggested_screening_questions)
                  ],
                  extractedSkills: candidateOutput.extracted_skills,
                  skillMatch: candidateOutput.skill_match
                },
                job: candidate.jobs
              })
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "live_interview_suggestions",
          strict: true,
          schema: liveSuggestionsSchema
        }
      }
    });
    const modelData = JSON.parse(response.output_text) as LiveSuggestions;
    const data = mergeSuggestions(liveSuggestionsBase, {
      ...modelData,
      meetingNotes:
        transcriptBySpeaker.candidateLines.length > 0
          ? liveMeetingNotesOnly(modelData.meetingNotes)
          : []
    });

    await supabase.from("interview_sessions").update({ ai_interview_output: data }).eq("id", sessionId);
    await saveInterviewSummary({
      candidateId,
      candidateOutput,
      data,
      notes,
      supabase
    });

    return Response.json({ data, source: "openai" });
  } catch (error) {
    await saveInterviewSummary({
      candidateId,
      candidateOutput,
      data: fallback,
      notes,
      supabase
    });

    return Response.json({
      data: fallback,
      source: "fallback",
      error: error instanceof Error ? error.message : "Unable to generate live suggestions."
    });
  }
}
