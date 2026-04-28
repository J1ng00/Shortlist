export const candidateExtractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    fullName: { type: "string" },
    email: { type: "string" },
    currentRole: { type: "string" },
    location: { type: "string" },
    experienceYears: { type: "integer" },
    summary: { type: "string" },
    extractedSkills: {
      type: "array",
      items: { type: "string" }
    },
    notableProjects: {
      type: "array",
      items: { type: "string" }
    },
    employmentSignals: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: [
    "fullName",
    "email",
    "currentRole",
    "location",
    "experienceYears",
    "summary",
    "extractedSkills",
    "notableProjects",
    "employmentSignals"
  ]
} as const;

export const candidateEvaluationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    fitScore: { type: "integer" },
    aiSummary: { type: "string" },
    strengths: {
      type: "array",
      items: { type: "string" }
    },
    missingRequirements: {
      type: "array",
      items: { type: "string" }
    },
    areasToValidate: {
      type: "array",
      items: { type: "string" }
    },
    skillMatch: {
      type: "object",
      additionalProperties: false,
      properties: {
        matched: { type: "array", items: { type: "string" } },
        partial: { type: "array", items: { type: "string" } },
        missing: { type: "array", items: { type: "string" } }
      },
      required: ["matched", "partial", "missing"]
    },
    suggestedScreeningQuestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          reason: { type: "string" }
        },
        required: ["question", "reason"]
      }
    }
  },
  required: [
    "fitScore",
    "aiSummary",
    "strengths",
    "missingRequirements",
    "areasToValidate",
    "skillMatch",
    "suggestedScreeningQuestions"
  ]
} as const;