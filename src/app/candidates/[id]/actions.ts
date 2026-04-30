"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { analyzeCandidateById } from "@/lib/candidate-analysis";
import { sendInterviewInvitation } from "@/lib/email/interview-invitation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CandidateOutput = {
  [key: string]: unknown;
  hr_decision?: {
    outcome: string;
    label: string;
    note: string | null;
    email_preview_url?: string | null;
    decided_at: string;
  };
  extracted_profile?: {
    fullName?: string;
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

export async function createInterviewSession(formData: FormData) {
  const candidateId = String(formData.get("candidate_id") ?? "").trim();

  if (!candidateId) {
    throw new Error("Candidate id is required.");
  }

  const supabase = createServerSupabaseClient();
  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .select("id")
    .eq("id", candidateId)
    .maybeSingle();

  if (candidateError) {
    throw new Error(candidateError.message);
  }

  if (!candidate) {
    throw new Error("Candidate must be saved before starting a live interview.");
  }

  const { error } = await supabase.from("interview_sessions").insert({
    candidate_id: candidateId,
    notes: "",
    ai_interview_output: {},
    final_decision_output: {}
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/interview/${candidateId}/live`);
}

export async function updateCandidateDecision(formData: FormData) {
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  const outcome = String(formData.get("outcome") ?? "").trim();
  const interviewDate = String(formData.get("interview_date") ?? "").trim();
  const interviewTime = String(formData.get("interview_time") ?? "").trim();
  const scheduledInterviewNote =
    outcome === "next_stage" && interviewDate && interviewTime
      ? `Interview scheduled for ${interviewDate} at ${interviewTime}.`
      : null;
  const note = String(formData.get("note") ?? "").trim() || scheduledInterviewNote;

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
    .select("full_name, email, ai_candidate_output, jobs(role_title, business_name)")
    .eq("id", candidateId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const output = ((data?.ai_candidate_output ?? {}) as CandidateOutput);
  const job = Array.isArray(data.jobs) ? data.jobs[0] : data.jobs;
  let emailPreviewUrl: string | null = null;

  if (outcome === "next_stage") {
    if (!interviewDate || !interviewTime) {
      throw new Error("Choose an interview date and time before moving to next stage.");
    }

    if (!data.email) {
      throw new Error("Candidate does not have an email address for the interview invitation.");
    }

    if (!job) {
      throw new Error("Candidate job context is missing.");
    }

    const emailResult = await sendInterviewInvitation({
      candidateEmail: data.email,
      candidateName: output.extracted_profile?.fullName || data.full_name,
      appliedPosition: job.role_title,
      companyName: job.business_name,
      interviewDate,
      interviewTime,
    });
    emailPreviewUrl = emailResult.previewUrl;
  }

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
          email_preview_url: emailPreviewUrl,
          interview_date: interviewDate || null,
          interview_time: interviewTime || null,
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
