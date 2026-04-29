"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const RESUME_BUCKET = "candidate-resumes";

function optionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length ? value : null;
}

export async function createCandidate(formData: FormData) {
  const supabase = createServerSupabaseClient();
  const jobId = String(formData.get("job_id") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const resume = formData.get("resume");

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

  const { data: candidate, error: insertError } = await supabase
    .from("candidates")
    .insert({
      job_id: jobId,
      full_name: fullName,
      email: optionalText(formData, "email"),
      phone: optionalText(formData, "phone"),
      current_position: optionalText(formData, "current_position"),
      github_url: optionalText(formData, "github_url"),
      linkedin_url: optionalText(formData, "linkedin_url"),
      profile_notes: optionalText(formData, "profile_notes"),
      stage: "review"
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  const resumePath = `${jobId}/${candidate.id}/resume.pdf`;
  const resumeBuffer = await resume.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(RESUME_BUCKET)
    .upload(resumePath, resumeBuffer, {
      contentType: "application/pdf",
      upsert: true
    });

  if (uploadError) {
    await supabase.from("candidates").delete().eq("id", candidate.id);
    throw new Error(uploadError.message);
  }

  const { error: updateError } = await supabase
    .from("candidates")
    .update({
      resume_file_path: resumePath,
      updated_at: new Date().toISOString()
    })
    .eq("id", candidate.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  redirect(`/candidates/${candidate.id}`);
}
