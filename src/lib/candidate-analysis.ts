import { extractCandidateProfile } from "@/lib/ai/extract-candidate";
import { evaluateCandidate } from "@/lib/ai/evaluate-candidate";
import { enrichGitHubProfile } from "@/lib/github/enrich-profile";
import { extractPdfText } from "@/lib/pdf/extract-text";
import type { createServerSupabaseClient } from "@/lib/supabase/server";

type SupabaseClient = ReturnType<typeof createServerSupabaseClient>;

type CandidateForAnalysis = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  current_position: string | null;
  github_url: string | null;
  ai_candidate_output: {
    submitted_application?: {
      github_url?: string | null;
      linkedin_url?: string | null;
      manual_profile_notes?: string | null;
    };
  } | null;
  resume_file_path: string | null;
  resume_text: string | null;
  jobs:
    | {
        role_title: string;
        business_name: string;
        company_values: string[];
        must_have_skills: string[];
        nice_to_have_skills: string[];
        interview_focus: string[];
        ai_job_output: {
          job_description?: string;
        } | null;
      }
    | Array<{
        role_title: string;
        business_name: string;
        company_values: string[];
        must_have_skills: string[];
        nice_to_have_skills: string[];
        interview_focus: string[];
        ai_job_output: {
          job_description?: string;
        } | null;
      }>
    | null;
};

function normalizeJob(candidate: CandidateForAnalysis) {
  return Array.isArray(candidate.jobs) ? candidate.jobs[0] ?? null : candidate.jobs;
}

export async function analyzeCandidateById(supabase: SupabaseClient, candidateId: string) {
  const { data, error } = await supabase
    .from("candidates")
    .select(
      "id, full_name, email, phone, current_position, github_url, ai_candidate_output, resume_file_path, resume_text, jobs(role_title, business_name, company_values, must_have_skills, nice_to_have_skills, interview_focus, ai_job_output)"
    )
    .eq("id", candidateId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const candidate = data as unknown as CandidateForAnalysis;
  const job = normalizeJob(candidate);

  if (!job) {
    throw new Error("Candidate is not linked to a saved job.");
  }

  let resumeText = candidate.resume_text;

  if (!resumeText && candidate.resume_file_path) {
    const { data: resumeFile, error: downloadError } = await supabase.storage
      .from("candidate-resumes")
      .download(candidate.resume_file_path);

    if (downloadError) {
      throw new Error(downloadError.message);
    }

    resumeText = await extractPdfText(Buffer.from(await resumeFile.arrayBuffer()));
  }

  if (!resumeText) {
    throw new Error("Candidate does not have resume text.");
  }

  const submittedApplication = candidate.ai_candidate_output?.submitted_application ?? {};
  const githubUrl = candidate.github_url ?? submittedApplication.github_url ?? null;
  const githubProfile = await enrichGitHubProfile(githubUrl);
  const evidenceContext = {
    github_profile: githubProfile,
    manual_profile_notes: submittedApplication.manual_profile_notes ?? null,
  };

  const extractedProfile = await extractCandidateProfile({
    resumeText,
    githubUrl,
    githubProfile,
    linkedinUrl: submittedApplication.linkedin_url,
    manualProfileNotes: submittedApplication.manual_profile_notes,
    jobTitle: job.role_title,
    companyName: job.business_name,
  });

  const evaluation = await evaluateCandidate({
    job: {
      title: job.role_title,
      businessName: job.business_name,
      requirements: {
        mustHaveSkills: job.must_have_skills,
        niceToHaveSkills: job.nice_to_have_skills,
        interviewFocus: job.interview_focus,
        companyValues: job.company_values,
      },
      description: job.ai_job_output?.job_description ?? null,
    },
    extractedProfile,
    evidenceContext,
  });
  const evidenceSnapshot = {
    submitted_application: {
      name: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone,
      current_role: candidate.current_position,
      github_url: githubUrl,
      linkedin_url: submittedApplication.linkedin_url ?? null,
      manual_profile_notes: submittedApplication.manual_profile_notes ?? null,
    },
    github_profile: githubProfile,
    resume_text: resumeText,
    job_context: {
      title: job.role_title,
      business_name: job.business_name,
      requirements: {
        must_have_skills: job.must_have_skills,
        nice_to_have_skills: job.nice_to_have_skills,
        interview_focus: job.interview_focus,
        company_values: job.company_values,
      },
      description: job.ai_job_output?.job_description ?? null,
    },
    extracted_profile: extractedProfile,
    evaluation,
    note: "GitHub enrichment uses public GitHub API data. LinkedIn is stored as a submitted URL only; no LinkedIn scraping is performed.",
  };

  const aiCandidateOutput = {
    status: "ready",
    submitted_application: submittedApplication,
    evidence_snapshot: evidenceSnapshot,
    extracted_profile: extractedProfile,
    extracted_skills: extractedProfile.extractedSkills,
    strengths: evaluation.strengths,
    missing_requirements: evaluation.missingRequirements,
    areas_to_validate: evaluation.areasToValidate,
    recommendation: evaluation.recommendation,
    recommendation_headline: evaluation.recommendationHeadline,
    recommendation_reason: evaluation.recommendationReason,
    next_best_action: evaluation.nextBestAction,
    evidence_for: evaluation.evidenceFor,
    evidence_against: evaluation.evidenceAgainst,
    suggested_screening_questions: evaluation.suggestedScreeningQuestions,
    ai_summary: evaluation.aiSummary,
    skill_match: evaluation.skillMatch,
    initial_fit_score: evaluation.fitScore,
    raw_model_output: {
      extractedProfile,
      evaluation,
    },
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("candidates")
    .update({
      full_name: candidate.full_name,
      email: candidate.email,
      current_position: extractedProfile.currentRole || candidate.current_position,
      resume_text: resumeText,
      initial_fit_score: evaluation.fitScore,
      ai_candidate_output: aiCandidateOutput,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidate.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return aiCandidateOutput;
}
