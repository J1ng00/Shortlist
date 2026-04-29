import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return Response.json({ error: "sessionId is required." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("notes")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    return Response.json({ error: "Unable to load interview session notes." }, { status: 500 });
  }

  return Response.json({
    notes: typeof data?.notes === "string" ? data.notes : ""
  });
}
