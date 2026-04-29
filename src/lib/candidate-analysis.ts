import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import type { createServerSupabaseClient } from "@/lib/supabase/server";

type SupabaseClient = ReturnType<typeof createServerSupabaseClient>;

export type CandidateAnalysisOutput = {
  summary: string;
  extracted_skills: string[];
  strengths: string[];
  missing_requirements: string[];
  areas_to_validate: string[];
  initial_fit_score: number;
  suggested_interview_questions: string[];
};

type CandidateForAnalysis = {
  id: string;
  full_name: string;
  current_position: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  profile_notes: string | null;
  resume_file_path: string | null;
  jobs:
    | {
        role_title: string;
        business_name: string;
        company_values: string[];
        must_have_skills: string[];
        nice_to_have_skills: string[];
        interview_focus: string[];
        ai_job_output: unknown;
      }
    | Array<{
        role_title: string;
        business_name: string;
        company_values: string[];
        must_have_skills: string[];
        nice_to_have_skills: string[];
        interview_focus: string[];
        ai_job_output: unknown;
      }>
    | null;
};

const candidateAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "extracted_skills",
    "strengths",
    "missing_requirements",
    "areas_to_validate",
    "initial_fit_score",
    "suggested_interview_questions"
  ],
  properties: {
    summary: { type: "string" },
    extracted_skills: { type: "array", items: { type: "string" } },
    strengths: { type: "array", items: { type: "string" } },
    missing_requirements: { type: "array", items: { type: "string" } },
    areas_to_validate: { type: "array", items: { type: "string" } },
    initial_fit_score: { type: "integer", minimum: 0, maximum: 100 },
    suggested_interview_questions: { type: "array", items: { type: "string" } }
  }
} as const;

function normalizeJob(candidate: CandidateForAnalysis) {
  return Array.isArray(candidate.jobs) ? candidate.jobs[0] ?? null : candidate.jobs;
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY in .env.local.");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

async function extractPdfText(file: Blob) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  const text = result.text.replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim();

  if (!text) {
    throw new Error("Could not extract text from the uploaded resume PDF.");
  }

  return text;
}

export async function analyzeCandidateById(supabase: SupabaseClient, candidateId: string) {
  const { data, error } = await supabase
    .from("candidates")
    .select(
      "id, full_name, current_position, github_url, linkedin_url, profile_notes, resume_file_path, jobs(role_title, business_name, company_values, must_have_skills, nice_to_have_skills, interview_focus, ai_job_output)"
    )
    .eq("id", candidateId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const candidate = data as unknown as CandidateForAnalysis;
  const job = normalizeJob(candidate);

  if (!candidate.resume_file_path) {
    throw new Error("Candidate does not have an uploaded resume PDF.");
  }

  if (!job) {
    throw new Error("Candidate is not linked to a saved job.");
  }

  const { data: resumeFile, error: downloadError } = await supabase.storage
    .from("candidate-resumes")
    .download(candidate.resume_file_path);

  if (downloadError) {
    throw new Error(downloadError.message);
  }

  const resumeText = await extractPdfText(resumeFile);
  const openai = getOpenAIClient();
  const model = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

  const response = await openai.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You are an evidence-based hiring assistant for an SME manager. Analyze candidates against the job requirements. Avoid culture-fit language; use values alignment or working style alignment. Tie every score to evidence and show uncertainty where evidence is missing."
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Analyze this candidate resume and optional profile context against the job. Return JSON only.",
          candidate: {
            full_name: candidate.full_name,
            current_position: candidate.current_position,
            github_url: candidate.github_url,
            linkedin_url: candidate.linkedin_url,
            profile_notes: candidate.profile_notes
          },
          job: {
            role_title: job.role_title,
            business_name: job.business_name,
            company_values: job.company_values,
            must_have_skills: job.must_have_skills,
            nice_to_have_skills: job.nice_to_have_skills,
            interview_focus: job.interview_focus,
            ai_job_output: job.ai_job_output
          },
          resume_text: resumeText
        })
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "candidate_analysis",
        strict: true,
        schema: candidateAnalysisSchema
      }
    }
  });

  const outputText = response.output_text;

  if (!outputText) {
    throw new Error("OpenAI did not return candidate analysis text.");
  }

  const analysis = JSON.parse(outputText) as CandidateAnalysisOutput;

  const { error: updateError } = await supabase
    .from("candidates")
    .update({
      resume_text: resumeText,
      ai_candidate_output: analysis,
      initial_fit_score: analysis.initial_fit_score,
      updated_at: new Date().toISOString()
    })
    .eq("id", candidate.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return analysis;
}
