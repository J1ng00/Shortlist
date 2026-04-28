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
}) {
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL!,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are an SME hiring copilot. Evaluate the candidate against the job. Be evidence-based, concise, and fair. Do not use protected traits. Return only structured JSON."
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
              candidate: args.extractedProfile
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