import { candidateAnalysisContract } from "@/lib/ai-json-contracts";
import { analyzeCandidateById } from "@/lib/candidate-analysis";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { candidate_id: candidateId } = (await request.json()) as {
    candidate_id?: string;
  };

  if (!candidateId) {
    return Response.json({ error: "candidate_id is required." }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const data = await analyzeCandidateById(supabase, candidateId);

    return Response.json({
      contract: candidateAnalysisContract,
      data
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Candidate analysis failed."
      },
      { status: 500 }
    );
  }
}
