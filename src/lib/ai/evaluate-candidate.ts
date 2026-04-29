import OpenAI from "openai";
import { candidateEvaluationSchema } from "./candidate-schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function evaluateCandidate(args: {
  job: {
    title: string;
    businessName: string;
    requirements: unknown;
    description?: string | null;
  };
  extractedProfile: unknown;
  evidenceContext?: unknown;
}) {
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are an SME hiring copilot for HR reviewers. Evaluate the candidate against the job with practical hiring judgment. Be evidence-based, concise, and fair. Do not use protected traits. Return a direct recommendation: hire, progress, hold, or reject. Make recommendationHeadline read like 'You should hire/progress/hold/reject this candidate because...' and ground every reason in the resume, links, notes, or missing evidence. Return only structured JSON."
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              job: args.job,
              candidate: args.extractedProfile,
              evidenceContext: args.evidenceContext ?? null
            })
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "candidate_evaluation",
        strict: true,
        schema: candidateEvaluationSchema
      }
    }
  });

  return JSON.parse(response.output_text);
}
