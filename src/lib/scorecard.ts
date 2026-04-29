import { getCandidate, getJob } from "@/lib/mock-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CandidateAnalysisOutput = {
  extracted_profile?: {
    name?: string;
    current_role?: string;
    experience_summary?: string;
    location?: string;
  };
  extracted_skills?: string[];
  strengths?: string[];
  missing_requirements?: string[];
  missing_skills?: string[];
  risks?: string[];
  areas_to_validate?: string[];
  things_to_verify?: string[];
  evidence_found?: string[];
  suggested_interview_questions?: string[];
  initial_fit_score?: number;
  match_score?: number;
  summary?: string;
};

type CandidateRow = {
  id: string;
  job_id: string;
  full_name: string;
  current_position: string | null;
  github_url: string | null;
  ai_candidate_output: CandidateAnalysisOutput | null;
  initial_fit_score: number | null;
};

export type PreInterviewScorecard = {
  source: "supabase" | "mock";
  candidateId: string;
  candidateName: string;
  currentRole: string;
  location?: string;
  githubUrl?: string;
  jobTitle: string;
  businessName: string;
  summary: string;
  matchScore: number;
  extractedSkills: string[];
  strengths: string[];
  risks: string[];
  evidenceFound: string[];
  thingsToVerify: string[];
  suggestedScreeningQuestions: string[];
};

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function asScore(value: unknown, fallback: number) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function unique(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function mockScorecard(candidateId: string): PreInterviewScorecard {
  const candidate = getCandidate(candidateId);
  const job = getJob(candidate.jobId);

  return {
    source: "mock",
    candidateId: candidate.id,
    candidateName: candidate.name,
    currentRole: candidate.currentRole,
    location: candidate.location,
    githubUrl: candidate.githubUrl,
    jobTitle: job.title,
    businessName: job.businessName,
    summary: candidate.aiSummary,
    matchScore: candidate.fitScore,
    extractedSkills: candidate.extractedSkills,
    strengths: candidate.strengths,
    risks: unique([...candidate.missingRequirements, ...candidate.areasToValidate]),
    evidenceFound: unique([...candidate.strengths, ...candidate.extractedSkills]),
    thingsToVerify: candidate.areasToValidate,
    suggestedScreeningQuestions: candidate.suggestedInterviewQuestions
  };
}

export async function getPreInterviewScorecard(candidateId: string): Promise<PreInterviewScorecard> {
  const fallback = mockScorecard(candidateId);

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("candidates")
      .select("id, job_id, full_name, current_position, github_url, ai_candidate_output, initial_fit_score")
      .eq("id", candidateId)
      .maybeSingle();

    if (error || !data) {
      return fallback;
    }

    const candidate = data as CandidateRow;
    const { data: job } = await supabase
      .from("jobs")
      .select("role_title, business_name")
      .eq("id", candidate.job_id)
      .maybeSingle();
    const output = candidate.ai_candidate_output ?? {};
    const extractedProfile = output.extracted_profile ?? {};
    const missingRequirements = unique([
      ...asStringArray(output.missing_requirements),
      ...asStringArray(output.missing_skills)
    ]);
    const risks = unique([...asStringArray(output.risks), ...missingRequirements, ...asStringArray(output.areas_to_validate)]);
    const thingsToVerify = unique([
      ...asStringArray(output.things_to_verify),
      ...asStringArray(output.areas_to_validate)
    ]);
    const strengths = asStringArray(output.strengths);
    const extractedSkills = asStringArray(output.extracted_skills);

    return {
      source: "supabase",
      candidateId: candidate.id,
      candidateName: candidate.full_name || extractedProfile.name || fallback.candidateName,
      currentRole: candidate.current_position || extractedProfile.current_role || fallback.currentRole,
      location: extractedProfile.location || fallback.location,
      githubUrl: candidate.github_url ?? undefined,
      jobTitle: String(job?.role_title ?? fallback.jobTitle),
      businessName: String(job?.business_name ?? fallback.businessName),
      summary: output.summary || extractedProfile.experience_summary || fallback.summary,
      matchScore: asScore(output.match_score ?? output.initial_fit_score ?? candidate.initial_fit_score, fallback.matchScore),
      extractedSkills: extractedSkills.length ? extractedSkills : fallback.extractedSkills,
      strengths: strengths.length ? strengths : fallback.strengths,
      risks: risks.length ? risks : fallback.risks,
      evidenceFound: unique([...asStringArray(output.evidence_found), ...strengths, ...extractedSkills]),
      thingsToVerify: thingsToVerify.length ? thingsToVerify : fallback.thingsToVerify,
      suggestedScreeningQuestions: asStringArray(output.suggested_interview_questions)
    };
  } catch {
    return fallback;
  }
}
