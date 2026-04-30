import { candidates, getCandidate, getInterviewSession, getJob, getRecommendation } from "@/lib/mock-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Candidate, InterviewSession, Job, Recommendation, RubricCategory } from "@/lib/types";

type DataRow = Record<string, unknown>;

function isMockCandidate(candidateId: string) {
  return candidates.some((candidate) => candidate.id === candidateId);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toRubric(value: unknown): RubricCategory[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const row = item as DataRow;

    return {
      name: String(row.name ?? row.category ?? "Rubric item"),
      weight: Number(row.weight ?? 0),
      evidence: String(row.evidence ?? row.evidence_to_look_for ?? ""),
      score: row.score === undefined ? undefined : Number(row.score)
    };
  });
}

function getObject(value: unknown): DataRow {
  return value && typeof value === "object" ? value as DataRow : {};
}

function mapJob(row: DataRow): Job {
  const aiOutput = getObject(row.ai_job_output);

  return {
    id: String(row.id),
    title: String(row.role_title ?? ""),
    businessName: String(row.business_name ?? ""),
    location: String(row.location ?? ""),
    workType: String(row.work_type ?? ""),
    companyValues: toStringArray(row.company_values),
    mustHaves: toStringArray(row.must_have_skills),
    niceToHaves: toStringArray(row.nice_to_have_skills),
    interviewFocus: toStringArray(row.interview_focus),
    generatedJobDescription: String(aiOutput.job_description ?? ""),
    evaluationRubric: toRubric(aiOutput.evaluation_rubric),
    interviewCategories: toStringArray(aiOutput.interview_categories)
  };
}

function mapCandidate(row: DataRow): Candidate {
  const aiOutput = getObject(row.ai_candidate_output);

  return {
    id: String(row.id),
    jobId: String(row.job_id),
    name: String(row.full_name ?? "Unnamed candidate"),
    currentRole: String(row.current_position ?? "Candidate"),
    experienceYears: Number(aiOutput.experience_years ?? 0),
    location: String(aiOutput.location ?? ""),
    githubUrl: typeof row.github_url === "string" ? row.github_url : undefined,
    fitScore: Number(row.initial_fit_score ?? aiOutput.initial_fit_score ?? 0),
    stage: row.stage === "interview" || row.stage === "decision" ? row.stage : "review",
    extractedSkills: toStringArray(aiOutput.extracted_skills),
    strengths: toStringArray(aiOutput.strengths),
    missingRequirements: toStringArray(aiOutput.missing_requirements),
    areasToValidate: toStringArray(aiOutput.areas_to_validate),
    suggestedInterviewQuestions: toStringArray(aiOutput.suggested_interview_questions),
    aiSummary: String(aiOutput.ai_summary ?? "Candidate analysis is still being generated.")
  };
}

export async function getCandidateBundle(candidateId: string): Promise<{ candidate: Candidate; job: Job }> {
  if (isMockCandidate(candidateId)) {
    const candidate = getCandidate(candidateId);
    return { candidate, job: getJob(candidate.jobId) };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("candidates")
    .select("*, jobs(*)")
    .eq("id", candidateId)
    .single();

  if (error || !data) {
    const candidate = getCandidate(candidateId);
    return { candidate, job: getJob(candidate.jobId) };
  }

  return {
    candidate: mapCandidate(data),
    job: mapJob(data.jobs)
  };
}

export async function getInterviewBundle(candidateId: string): Promise<{ candidate: Candidate; job: Job; session: InterviewSession }> {
  if (isMockCandidate(candidateId)) {
    const candidate = getCandidate(candidateId);
    return {
      candidate,
      job: getJob(candidate.jobId),
      session: getInterviewSession(candidate.id)
    };
  }

  const { candidate, job } = await getCandidateBundle(candidateId);
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const output = data?.ai_interview_output ?? {};
  const session: InterviewSession = {
    id: data?.id ?? `int-${candidateId}`,
    candidateId,
    interviewer: data?.interviewer_name ?? "Hiring manager",
    notes: data?.notes ?? "",
    suggestedQuestions: toStringArray(output.follow_up_questions).length
      ? toStringArray(output.follow_up_questions)
      : candidate.suggestedInterviewQuestions,
    inconsistenciesToProbe: toStringArray(output.inconsistencies_to_probe),
    missingEvidence: toStringArray(output.missing_evidence).length
      ? toStringArray(output.missing_evidence)
      : candidate.areasToValidate,
    rubricUpdates: toRubric(output.rubric_score_updates)
  };

  return { candidate, job, session };
}

export async function getRecommendationBundle(candidateId: string): Promise<{ candidate: Candidate; job: Job; recommendation: Recommendation }> {
  if (isMockCandidate(candidateId)) {
    const candidate = getCandidate(candidateId);
    return {
      candidate,
      job: getJob(candidate.jobId),
      recommendation: getRecommendation(candidate.id)
    };
  }

  const { candidate, job, session } = await getInterviewBundle(candidateId);
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("interview_sessions")
    .select("final_decision_output")
    .eq("id", session.id)
    .maybeSingle();

  const output = data?.final_decision_output ?? {};
  const recommendation: Recommendation = {
    candidateId,
    decision: output.recommendation ?? "review",
    confidence: output.confidence ?? "Medium",
    supportingEvidence: toStringArray(output.supporting_evidence).length
      ? toStringArray(output.supporting_evidence)
      : candidate.strengths,
    concerns: toStringArray(output.concerns).length ? toStringArray(output.concerns) : candidate.areasToValidate,
    nextStep: output.next_step ?? "Review the candidate evidence and interview notes before making a final decision."
  };

  return { candidate, job, recommendation };
}
