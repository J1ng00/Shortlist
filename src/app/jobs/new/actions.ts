"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { generateJobKit, jobInputFromFormData } from "@/lib/job-ai";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function createJob(formData: FormData) {
  const supabase = createServerSupabaseClient();
  const jobInput = jobInputFromFormData(formData);

  if (!jobInput.role_title || !jobInput.business_name) {
    throw new Error("Role title and business name are required.");
  }

  const aiJobOutput = await generateJobKit(jobInput);

  const { error } = await supabase.from("jobs").insert({
    role_title: jobInput.role_title,
    business_name: jobInput.business_name,
    location: jobInput.location,
    work_type: jobInput.work_type,
    company_values: jobInput.company_values,
    must_have_skills: jobInput.must_have_skills,
    nice_to_have_skills: jobInput.nice_to_have_skills,
    interview_focus: jobInput.interview_focus,
    ai_job_output: aiJobOutput
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/jobs");
}

export async function updateJob(formData: FormData) {
  const supabase = createServerSupabaseClient();
  const jobInput = jobInputFromFormData(formData);
  const jobId = String(formData.get("job_id") ?? "").trim();

  if (!jobId) {
    throw new Error("Job id is required.");
  }

  if (!jobInput.role_title || !jobInput.business_name) {
    throw new Error("Role title and business name are required.");
  }

  const aiJobOutput = await generateJobKit(jobInput);

  const { error } = await supabase
    .from("jobs")
    .update({
      role_title: jobInput.role_title,
      business_name: jobInput.business_name,
      location: jobInput.location,
      work_type: jobInput.work_type,
      company_values: jobInput.company_values,
      must_have_skills: jobInput.must_have_skills,
      nice_to_have_skills: jobInput.nice_to_have_skills,
      interview_focus: jobInput.interview_focus,
      ai_job_output: aiJobOutput,
      updated_at: new Date().toISOString()
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/jobs/${jobId}/edit`);
}

export async function deleteJob(formData: FormData) {
  const supabase = createServerSupabaseClient();
  const jobId = String(formData.get("job_id") ?? "").trim();

  if (!jobId) {
    throw new Error("Job id is required.");
  }

  const { error } = await supabase.from("jobs").delete().eq("id", jobId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/jobs");
}
