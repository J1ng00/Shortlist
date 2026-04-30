import OpenAI from "openai";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type FinalInterviewSummary = {
  headline: string;
  summary: string;
  strengths: string[];
  concerns: string[];
  nextStep: string;
};

const finalInterviewSummarySchema = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "summary", "strengths", "concerns", "nextStep"],
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    concerns: { type: "array", items: { type: "string" } },
    nextStep: { type: "string" }
  }
};

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function fallbackSummary(notes: string, aiOutput: Record<string, unknown>): FinalInterviewSummary {
  const meetingNotes = stringArray(aiOutput.meetingNotes);
  const evidenceCaptured = stringArray(aiOutput.evidenceCaptured);
  const flags = stringArray(aiOutput.flags);
  const transcriptLines = notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const strongestNotes = meetingNotes.length ? meetingNotes : transcriptLines.slice(-3);

  return {
    headline: "Interview completed",
    summary: strongestNotes.length
      ? strongestNotes.slice(0, 3).join(" ")
      : "The interview was completed, but no transcript or meeting notes were captured.",
    strengths: evidenceCaptured.slice(0, 4),
    concerns: flags.slice(0, 4),
    nextStep: "Review the transcript and decide whether to schedule another interview or move to a final hiring decision."
  };
}

function currentInterviewSummaryCount(candidateOutput: Record<string, unknown>) {
  const count = candidateOutput.interview_summary_count;

  if (typeof count === "number" && count > 0) {
    return count;
  }

  return candidateOutput.interview_summary ? 1 : 0;
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
    supabase
      .from("interview_sessions")
      .select("id, notes, ai_interview_output")
      .eq("id", sessionId)
      .maybeSingle(),
    supabase
      .from("candidates")
      .select("id, full_name, current_position, ai_candidate_output, jobs(role_title, business_name)")
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
  const aiInterviewOutput = (session.ai_interview_output ?? {}) as Record<string, unknown>;
  const candidateOutput = (candidate.ai_candidate_output ?? {}) as Record<string, unknown>;
  const job = Array.isArray(candidate.jobs) ? candidate.jobs[0] : candidate.jobs;
  let summary = fallbackSummary(notes, aiInterviewOutput);
  let source = "fallback";

  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.responses.create({
        model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  "You summarize completed hiring interviews for human HR reviewers. Use only the supplied transcript, live meeting notes, candidate context, and job context. Be concise, evidence-based, and fair. Do not infer protected traits. Return structured JSON only."
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  transcript: notes,
                  liveInterviewOutput: aiInterviewOutput,
                  candidate: {
                    name: candidate.full_name,
                    currentPosition: candidate.current_position,
                    aiCandidateOutput: candidateOutput
                  },
                  job
                })
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "final_interview_summary",
            strict: true,
            schema: finalInterviewSummarySchema
          }
        }
      });

      summary = JSON.parse(response.output_text) as FinalInterviewSummary;
      source = "openai";
    } catch {
      source = "fallback";
    }
  }

  const finalizedAt = new Date().toISOString();
  const finalOutput = {
    ...summary,
    source,
    finalizedAt,
    sessionId
  };
  const nextCandidateOutput = {
    ...candidateOutput,
    interview_summary: finalOutput,
    interview_summary_count: currentInterviewSummaryCount(candidateOutput) + 1
  };

  const [{ error: sessionUpdateError }, { error: candidateUpdateError }] = await Promise.all([
    supabase
      .from("interview_sessions")
      .update({
        final_decision_output: finalOutput,
        updated_at: finalizedAt
      })
      .eq("id", sessionId),
    supabase
      .from("candidates")
      .update({
        ai_candidate_output: nextCandidateOutput,
        updated_at: finalizedAt
      })
      .eq("id", candidateId)
  ]);

  if (sessionUpdateError || candidateUpdateError) {
    return Response.json({ error: "Unable to save interview summary." }, { status: 500 });
  }

  return Response.json({ data: finalOutput });
}
