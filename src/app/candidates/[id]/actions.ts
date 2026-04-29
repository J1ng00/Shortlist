"use server";

import { revalidatePath } from "next/cache";

import { analyzeCandidateById } from "@/lib/candidate-analysis";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CandidateOutput = {
  [key: string]: unknown;
  hr_decision?: {
    outcome: string;
    label: string;
    note: string | null;
    decided_at: string;
  };
};

export async function analyzeCandidate(formData: FormData) {
  const candidateId = String(formData.get("candidate_id") ?? "").trim();

  if (!candidateId) {
    throw new Error("Candidate id is required.");
  }

  const supabase = createServerSupabaseClient();
  await analyzeCandidateById(supabase, candidateId);
  revalidatePath("/candidates");
  revalidatePath(`/candidates/${candidateId}`);
}

export async function updateCandidateDecision(formData: FormData) {
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  const outcome = String(formData.get("outcome") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!candidateId) {
    throw new Error("Candidate id is required.");
  }

  const decisionMap: Record<string, { stage: "review" | "interview" | "decision"; label: string }> = {
    review: { stage: "review", label: "Keep in review" },
    next_stage: { stage: "interview", label: "Move to next stage" },
    rejected: { stage: "decision", label: "Rejected" },
    hired: { stage: "decision", label: "Hire" },
  };
  const decision = decisionMap[outcome];

  if (!decision) {
    throw new Error("Unsupported candidate decision.");
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("candidates")
    .select("ai_candidate_output")
    .eq("id", candidateId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const output = ((data?.ai_candidate_output ?? {}) as CandidateOutput);
  const { error: updateError } = await supabase
    .from("candidates")
    .update({
      stage: decision.stage,
      ai_candidate_output: {
        ...output,
        hr_decision: {
          outcome,
          label: decision.label,
          note,
          decided_at: new Date().toISOString(),
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/candidates");
  revalidatePath(`/candidates/${candidateId}`);
}
