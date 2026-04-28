export const jobGenerationContract = {
  job_description: "string",
  evaluation_rubric: [
    {
      category: "string",
      weight: "number",
      evidence_to_look_for: "string"
    }
  ],
  interview_categories: ["string"]
};

export const candidateAnalysisContract = {
  extracted_skills: ["string"],
  strengths: ["string"],
  missing_requirements: ["string"],
  areas_to_validate: ["string"],
  initial_fit_score: "number 0-100",
  suggested_interview_questions: ["string"]
};

export const interviewCopilotContract = {
  follow_up_questions: ["string"],
  inconsistencies_to_probe: ["string"],
  rubric_score_updates: [
    {
      category: "string",
      score: "number 1-5",
      evidence: "string"
    }
  ],
  missing_evidence: ["string"]
};

export const finalDecisionContract = {
  recommendation: "advance | review | do_not_progress",
  confidence: "High | Medium | Low",
  supporting_evidence: ["string"],
  concerns: ["string"],
  next_step: "string"
};
