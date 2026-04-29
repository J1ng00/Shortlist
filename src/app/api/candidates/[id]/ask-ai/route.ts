import OpenAI from "openai";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as ChatMessage;
  return (message.role === "user" || message.role === "assistant") && typeof message.content === "string";
}

function compactJson(value: unknown, maxLength = 90000) {
  const json = JSON.stringify(value, null, 2);

  if (json.length <= maxLength) {
    return json;
  }

  return `${json.slice(0, maxLength)}\n\n[Context truncated to fit the chat request.]`;
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { messages?: unknown };
  const messages = Array.isArray(body.messages) ? body.messages.filter(isChatMessage).slice(-8) : [];
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");

  if (!latestUserMessage?.content.trim()) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY." }, { status: 500 });
  }

  const { data: candidate, error } = await supabaseAdmin
    .from("candidates")
    .select("*, jobs(*)")
    .eq("id", id)
    .maybeSingle();

  if (error || !candidate) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  const submittedApplication = candidate.ai_candidate_output?.submitted_application ?? {};
  const evidenceSnapshot = candidate.ai_candidate_output?.evidence_snapshot ?? null;
  const job = Array.isArray(candidate.jobs) ? candidate.jobs[0] : candidate.jobs;
  const rawContext = {
    candidate_record: {
      id: candidate.id,
      full_name: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone,
      current_position: candidate.current_position,
      github_url: candidate.github_url ?? submittedApplication.github_url ?? null,
      linkedin_url: candidate.linkedin_url ?? submittedApplication.linkedin_url ?? null,
      profile_notes: candidate.profile_notes,
      manual_profile_notes: candidate.manual_profile_notes ?? submittedApplication.manual_profile_notes ?? null,
      resume_file_path: candidate.resume_file_path,
      resume_text: candidate.resume_text,
      stage: candidate.stage,
      initial_fit_score: candidate.initial_fit_score,
      created_at: candidate.created_at,
      updated_at: candidate.updated_at,
    },
    job_record: job,
    ai_candidate_output: candidate.ai_candidate_output,
    raw_evidence_snapshot: evidenceSnapshot,
    context_note:
      "Use this Supabase context as the source of truth. GitHub enrichment is public GitHub API data if present. LinkedIn is a submitted URL only unless explicit notes were provided.",
  };
  const conversationTranscript = messages
    .map((message) => `${message.role === "assistant" ? "Assistant" : "Reviewer"}: ${message.content}`)
    .join("\n\n");

  try {
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are an AI hiring chat assistant for an internal HR reviewer. Answer only from the supplied Supabase candidate context and the current conversation. Be concise, practical, and evidence-based. Do not infer protected traits or make decisions based on protected traits. If the context does not contain the answer, say what is missing. When giving recommendations, frame them as decision support for a human reviewer.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Supabase candidate context:\n${compactJson(rawContext)}\n\nRecent conversation:\n${conversationTranscript}`,
            },
          ],
        },
      ],
    });

    return NextResponse.json({ answer: response.output_text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ask AI request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
