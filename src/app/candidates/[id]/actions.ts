"use server";

import { revalidatePath } from "next/cache";

import { analyzeCandidateById } from "@/lib/candidate-analysis";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function analyzeCandidate(formData: FormData) {
  const candidateId = String(formData.get("candidate_id") ?? "").trim();

  if (!candidateId) {
    throw new Error("Candidate id is required.");
  }

  const supabase = createServerSupabaseClient();
  await analyzeCandidateById(supabase, candidateId);
  revalidatePath(`/candidates/${candidateId}`);
}
