import type { Candidate, InterviewSession, Job, Recommendation } from "@/lib/types";

export const jobs: Job[] = [
  {
    id: "job-ops-coordinator",
    title: "Operations Coordinator",
    businessName: "Harbour Lane Catering",
    location: "Sydney, NSW",
    workType: "Full-time, onsite",
    companyValues: ["Reliable service", "Clear communication", "Calm problem solving"],
    mustHaves: [
      "2+ years coordinating rosters or operations",
      "Strong customer communication",
      "Comfortable with spreadsheets and scheduling tools"
    ],
    niceToHaves: ["Hospitality or events experience", "Basic supplier management"],
    interviewFocus: ["Ownership under pressure", "Supplier issue handling", "Spreadsheet depth"],
    generatedJobDescription:
      "Harbour Lane Catering is hiring an Operations Coordinator to manage weekly rosters, supplier follow-up, and booking changes in a busy events environment. The right person is organised, calm with customers, and comfortable using spreadsheets to keep daily operations visible.",
    evaluationRubric: [
      {
        name: "Roster coordination",
        weight: 35,
        evidence: "Can plan shifts, resolve gaps, and communicate changes clearly"
      },
      {
        name: "Customer and supplier communication",
        weight: 30,
        evidence: "Handles operational problems without escalating every issue"
      },
      {
        name: "Values alignment",
        weight: 20,
        evidence: "Shows reliability, direct communication, and calm problem solving"
      },
      {
        name: "Tools and documentation",
        weight: 15,
        evidence: "Uses spreadsheets or scheduling tools to reduce errors"
      }
    ],
    interviewCategories: ["Operations scenarios", "Working style alignment", "Tooling depth"]
  }
];

export const candidates: Candidate[] = [
  {
    id: "cand-maya",
    jobId: "job-ops-coordinator",
    name: "Maya Chen",
    currentRole: "Events Assistant",
    experienceYears: 3,
    location: "Parramatta, NSW",
    githubUrl: "https://github.com/example/maya-ops-tracker",
    fitScore: 82,
    stage: "interview",
    extractedSkills: ["Roster coordination", "Supplier follow-up", "Customer communication", "Spreadsheet tracking"],
    strengths: [
      "Managed weekly event staffing schedules for 25 casual workers",
      "Handled last-minute supplier changes for weddings and corporate events",
      "Built spreadsheet tracker that reduced double-booking issues"
    ],
    missingRequirements: [
      "No clear evidence of owning a full operating budget",
      "Limited permanent team management experience"
    ],
    areasToValidate: [
      "Limited direct ownership of budgets",
      "Has not managed a permanent team before"
    ],
    suggestedInterviewQuestions: [
      "Tell me about a time you had to rebuild a roster with very little notice.",
      "How would you handle a supplier missing a delivery two hours before an event?",
      "What spreadsheet or scheduling workflows have you built yourself?"
    ],
    aiSummary:
      "Maya appears to be a strong practical match for a small operations team. Her events background maps well to roster coordination, supplier follow-up, and customer communication. The main interview focus should be whether she can independently prioritise under pressure, show working style alignment with the company values, and take ownership without heavy manager oversight."
  }
];

export const interviewSessions: InterviewSession[] = [
  {
    id: "int-maya",
    candidateId: "cand-maya",
    interviewer: "Sam Patel",
    notes:
      "Candidate gave clear examples about fixing roster gaps. Strong communication style. Need to test ownership, conflict handling, and spreadsheet depth.",
    suggestedQuestions: [
      "Tell me about a time you had to rebuild a roster with very little notice. What tradeoffs did you make?",
      "How would you handle a supplier missing a delivery two hours before an event?",
      "What spreadsheet or scheduling workflows have you built yourself?"
    ],
    inconsistenciesToProbe: [
      "Resume says she built the tracker, but interview answer suggested a manager provided the original template"
    ],
    missingEvidence: ["Budget ownership", "Permanent team management", "Escalation judgment"],
    rubricUpdates: [
      {
        name: "Roster coordination",
        weight: 35,
        evidence: "Strong examples of handling same-day roster gaps",
        score: 4
      },
      {
        name: "Tools and documentation",
        weight: 15,
        evidence: "Needs one deeper example of spreadsheet design",
        score: 3
      }
    ]
  }
];

export const recommendations: Recommendation[] = [
  {
    candidateId: "cand-maya",
    decision: "advance",
    confidence: "Medium",
    supportingEvidence: [
      "Strong evidence of roster coordination and calm customer communication",
      "Hospitality/events background is relevant to a fast-moving SME environment",
      "Resume and interview notes both suggest practical problem solving"
    ],
    concerns: [
      "Budget ownership evidence is still thin",
      "Team management experience should be checked with references"
    ],
    nextStep:
      "Reference check should validate reliability under pressure",
  }
];

export function getCandidate(candidateId: string) {
  return candidates.find((candidate) => candidate.id === candidateId) ?? candidates[0];
}

export function getJob(jobId: string) {
  return jobs.find((job) => job.id === jobId) ?? jobs[0];
}

export function getInterviewSession(candidateId: string) {
  return (
    interviewSessions.find((session) => session.candidateId === candidateId) ??
    interviewSessions[0]
  );
}

export function getRecommendation(candidateId: string) {
  return (
    recommendations.find((recommendation) => recommendation.candidateId === candidateId) ??
    recommendations[0]
  );
}
