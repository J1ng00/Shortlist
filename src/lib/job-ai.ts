import { jobGenerationContract } from "@/lib/ai-json-contracts";

export type JobGenerationInput = {
  business_name: string;
  role_title: string;
  location: string;
  work_type: string;
  company_values: string[];
  must_have_skills: string[];
  nice_to_have_skills: string[];
  interview_focus: string[];
};

export type JobGenerationOutput = {
  job_description: string;
  evaluation_rubric: Array<{
    category: string;
    weight: number;
    evidence_to_look_for: string;
  }>;
  interview_categories: string[];
};

export function linesFromValue(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function jobInputFromFormData(formData: FormData): JobGenerationInput {
  return {
    business_name: String(formData.get("business_name") ?? "").trim(),
    role_title: String(formData.get("role_title") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    work_type: String(formData.get("work_type") ?? "").trim(),
    company_values: linesFromValue(formData.get("company_values")),
    must_have_skills: linesFromValue(formData.get("must_have_skills")),
    nice_to_have_skills: linesFromValue(formData.get("nice_to_have_skills")),
    interview_focus: linesFromValue(formData.get("interview_focus"))
  };
}

export function parseJobOutput(value: FormDataEntryValue | null): JobGenerationOutput | null {
  if (!value) {
    return null;
  }

  try {
    return normalizeJobOutput(JSON.parse(String(value)));
  } catch {
    return null;
  }
}

export async function generateJobKit(input: JobGenerationInput): Promise<JobGenerationOutput> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You create concise hiring job kits for small business managers. Return only valid JSON matching the requested contract."
        },
        {
          role: "user",
          content: JSON.stringify({
            task:
              "Generate a short job summary, an evaluation rubric, and interview categories from this manager-entered role profile.",
            contract: jobGenerationContract,
            input
          })
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI job generation failed: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned an empty job generation response.");
  }

  return normalizeJobOutput(JSON.parse(content));
}

function normalizeJobOutput(value: unknown): JobGenerationOutput {
  const output = value as Partial<JobGenerationOutput>;

  return {
    job_description: String(output.job_description ?? "").trim(),
    evaluation_rubric: Array.isArray(output.evaluation_rubric)
      ? output.evaluation_rubric.map((item) => {
          const rubricItem = item as Partial<JobGenerationOutput["evaluation_rubric"][number]>;

          return {
            category: String(rubricItem.category ?? "").trim(),
            weight: Number(rubricItem.weight ?? 0),
            evidence_to_look_for: String(rubricItem.evidence_to_look_for ?? "").trim()
          };
        })
      : [],
    interview_categories: Array.isArray(output.interview_categories)
      ? output.interview_categories.map((item) => String(item).trim()).filter(Boolean)
      : []
  };
}
