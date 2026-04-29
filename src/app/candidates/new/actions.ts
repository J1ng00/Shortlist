"use server";

import { redirect } from "next/navigation";

import { analyzeCandidateById } from "@/lib/candidate-analysis";
import { extractPdfText } from "@/lib/pdf/extract-text";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function optionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length ? value : null;
}

export async function createCandidate(formData: FormData) {
  const supabase = createServerSupabaseClient();
  const jobId = String(formData.get("job_id") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const resume = formData.get("resume");
  const githubUrl = optionalText(formData, "github_url");
  const linkedinUrl = optionalText(formData, "linkedin_url");
  const notes = optionalText(formData, "profile_notes");

  if (!jobId) {
    throw new Error("Choose a job before uploading a candidate.");
  }

  if (!fullName) {
    throw new Error("Candidate name is required.");
  }

  if (!(resume instanceof File) || resume.size === 0) {
    throw new Error("Resume PDF is required.");
  }

  if (resume.type && resume.type !== "application/pdf") {
    throw new Error("Resume must be a PDF.");
  }

  const resumeText = await extractPdfText(Buffer.from(await resume.arrayBuffer()));

  if (!resumeText) {
    throw new Error("Could not extract text from the uploaded resume PDF.");
  }

  const { data: candidate, error: insertError } = await supabase
    .from("candidates")
    .insert({
      job_id: jobId,
      full_name: fullName,
      email: optionalText(formData, "email"),
      phone: optionalText(formData, "phone"),
      current_position: optionalText(formData, "current_position"),
      github_url: githubUrl,
      resume_text: resumeText,
      ai_candidate_output: {
        status: "submitted",
        submitted_application: {
          github_url: githubUrl,
          linkedin_url: linkedinUrl,
          manual_profile_notes: notes,
        },
      },
      stage: "review"
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  try {
    await analyzeCandidateById(supabase, candidate.id);
  } catch (analysisError) {
    await supabase
      .from("candidates")
      .update({
        ai_candidate_output: {
          status: "analysis_failed",
          submitted_application: {
            github_url: githubUrl,
            linkedin_url: linkedinUrl,
            manual_profile_notes: notes,
          },
          analysis_error: analysisError instanceof Error ? analysisError.message : "Candidate analysis failed.",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidate.id);
  }

  redirect(`/candidates/${candidate.id}`);
}
