export type HiringStage = "review" | "interview" | "decision";

export type Job = {
  id: string;
  title: string;
  businessName: string;
  location: string;
  workType: string;
  companyValues: string[];
  mustHaves: string[];
  niceToHaves: string[];
  interviewFocus: string[];
  generatedJobDescription: string;
  evaluationRubric: RubricCategory[];
  interviewCategories: string[];
};

export type Candidate = {
  id: string;
  jobId: string;
  name: string;
  currentRole: string;
  experienceYears: number;
  location: string;
  githubUrl?: string;
  fitScore: number;
  stage: HiringStage;
  extractedSkills: string[];
  strengths: string[];
  missingRequirements: string[];
  areasToValidate: string[];
  suggestedInterviewQuestions: string[];
  aiSummary: string;
};

export type RubricCategory = {
  name: string;
  weight: number;
  evidence: string;
  score?: number;
};

export type InterviewSession = {
  id: string;
  candidateId: string;
  interviewer: string;
  notes: string;
  suggestedQuestions: string[];
  inconsistenciesToProbe: string[];
  missingEvidence: string[];
  rubricUpdates: RubricCategory[];
};

export type Recommendation = {
  candidateId: string;
  decision: "advance" | "review" | "do_not_progress";
  confidence: "High" | "Medium" | "Low";
  supportingEvidence: string[];
  concerns: string[];
  nextStep: string;
};
