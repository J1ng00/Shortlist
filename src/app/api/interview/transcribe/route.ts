import { createServerSupabaseClient } from "@/lib/supabase/server";

const transcriptionModel = process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-mini-transcribe";
const transcriptionPrompt =
  process.env.OPENAI_TRANSCRIBE_PROMPT ??
  "This is an English hiring interview. Speakers may have Singaporean, Australian, or other accents. Preserve business, operations, software, GitHub, resume, and interview terminology. Do not invent words if speech is unclear.";

function normalizeTranscriptText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldDiscardTranscript(transcriptText: string) {
  const normalizedTranscript = normalizeTranscriptText(transcriptText);
  const normalizedPrompt = normalizeTranscriptText(transcriptionPrompt);
  const promptWords = normalizedPrompt.split(" ");
  const transcriptWords = normalizedTranscript.split(" ");
  const promptWordSet = new Set(promptWords);
  const overlappingPromptWords = transcriptWords.filter((word) => promptWordSet.has(word)).length;
  const overlapRatio = transcriptWords.length > 0 ? overlappingPromptWords / transcriptWords.length : 0;
  const promptPrefix = promptWords.slice(0, 5).join(" ");

  if (!normalizedTranscript) {
    return true;
  }

  if (normalizedTranscript.length <= 2) {
    return true;
  }

  if (normalizedTranscript === normalizedPrompt) {
    return true;
  }

  return (
    normalizedTranscript.includes(normalizedPrompt.slice(0, 80)) ||
    normalizedTranscript.startsWith(promptPrefix) ||
    (transcriptWords.length >= 5 && overlapRatio >= 0.8)
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json({ error: "Missing OPENAI_API_KEY." }, { status: 500 });
  }

  const formData = await request.formData();
  const audio = formData.get("audio");
  const sessionId = formData.get("sessionId");
  const speaker = formData.get("speaker");

  if (!(audio instanceof Blob)) {
    return Response.json({ error: "Audio file is required." }, { status: 400 });
  }

  if (typeof speaker !== "string" || !speaker.trim()) {
    return Response.json({ error: "Speaker label is required." }, { status: 400 });
  }

  const audioType = audio.type || "audio/webm";
  const audioFile = new File([audio], "interview-audio.webm", { type: audioType });
  const openAiFormData = new FormData();
  openAiFormData.append("model", transcriptionModel);
  openAiFormData.append("file", audioFile);
  openAiFormData.append("language", "en");
  openAiFormData.append("prompt", transcriptionPrompt);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: openAiFormData
  });

  if (!response.ok) {
    const errorBody = await response.text();

    return Response.json(
      {
        error: "OpenAI transcription failed.",
        detail: errorBody
      },
      { status: response.status }
    );
  }

  const payload = (await response.json()) as { text?: string };
  const transcriptText = payload.text?.trim() ?? "";

  if (shouldDiscardTranscript(transcriptText)) {
    return Response.json({
      model: transcriptionModel,
      speaker,
      text: ""
    });
  }

  if (transcriptText && typeof sessionId === "string" && sessionId.trim()) {
    const supabase = createServerSupabaseClient();
    const { data: session, error: readError } = await supabase
      .from("interview_sessions")
      .select("notes")
      .eq("id", sessionId)
      .maybeSingle();

    if (readError) {
      return Response.json({ error: "Unable to read interview session notes." }, { status: 500 });
    }

    const timestamp = new Date().toISOString();
    const currentNotes = typeof session?.notes === "string" ? session.notes : "";
    const nextLine = `[${timestamp}] ${speaker}: ${transcriptText}`;
    const nextNotes = `${currentNotes}${currentNotes ? "\n" : ""}${nextLine}`;
    const { error: updateError } = await supabase
      .from("interview_sessions")
      .update({ notes: nextNotes })
      .eq("id", sessionId);

    if (updateError) {
      return Response.json({ error: "Unable to save transcript line to interview notes." }, { status: 500 });
    }
  }

  return Response.json({
    model: transcriptionModel,
    speaker,
    text: transcriptText
  });
}
