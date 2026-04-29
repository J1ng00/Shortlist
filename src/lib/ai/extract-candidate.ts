import OpenAI from "openai";
import { candidateExtractionSchema } from "./candidate-schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function extractCandidateProfile(args: {
  resumeText: string;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  manualProfileNotes?: string | null;
  jobTitle: string;
  companyName: string;
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
              "You are a hiring data extraction assistant. Return only structured JSON that matches the provided schema. Be conservative. Do not invent facts."
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `
Job title: ${args.jobTitle}
Business name: ${args.companyName}
GitHub URL: ${args.githubUrl ?? "Not provided"}
LinkedIn URL: ${args.linkedinUrl ?? "Not provided"}
Manual notes: ${args.manualProfileNotes ?? "None"}

Resume text:
${args.resumeText}
            `.trim()
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "candidate_extraction",
        strict: true,
        schema: candidateExtractionSchema
      }
    }
  });

  return JSON.parse(response.output_text);
}
