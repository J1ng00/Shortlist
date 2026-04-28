"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function lines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function createJob(formData: FormData) {
  const supabase = createServerSupabaseClient();

  const roleTitle = String(formData.get("role_title") ?? "").trim();
  const businessName = String(formData.get("business_name") ?? "").trim();

  if (!roleTitle || !businessName) {
    throw new Error("Role title and business name are required.");
  }

  const aiJobOutput = {
    job_description: String(formData.get("generated_job_description") ?? "").trim(),
    evaluation_rubric: [],
    interview_categories: lines(formData.get("interview_categories"))
  };

  const { error } = await supabase.from("jobs").insert({
    role_title: roleTitle,
    business_name: businessName,
    location: String(formData.get("location") ?? "").trim(),
    work_type: String(formData.get("work_type") ?? "").trim(),
    company_values: lines(formData.get("company_values")),
    must_have_skills: lines(formData.get("must_have_skills")),
    nice_to_have_skills: lines(formData.get("nice_to_have_skills")),
    interview_focus: lines(formData.get("interview_focus")),
    ai_job_output: aiJobOutput
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/candidates/cand-maya");
}
