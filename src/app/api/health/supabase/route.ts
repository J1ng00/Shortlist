import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("jobs").select("id").limit(1);

    if (error) {
      return Response.json(
        {
          ok: false,
          message: error.message,
          hint: "Check that schema.sql was run and RLS policies allow reads, or disable RLS during the hackathon demo."
        },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      message: "Supabase connection works and the jobs table is reachable."
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown Supabase health check error"
      },
      { status: 500 }
    );
  }
}
