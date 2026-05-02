import { jobGenerationContract, jobProfileDraftContract } from "@/lib/ai-json-contracts";
import type { CompanyResearchContext } from "@/lib/company-research";

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

export type JobProfileDraft = {
  company_values: string[];
  must_have_skills: string[];
  nice_to_have_skills: string[];
  interview_focus: string[];
  job_output: JobGenerationOutput;
};

type JobProfileDraftInput = Pick<JobGenerationInput, "business_name" | "role_title" | "location" | "work_type"> & {
  company_context?: CompanyResearchContext | null;
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

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-5.4",
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

        if (!shouldRetryOpenAi(response.status) || attempt === 3) {
          if (shouldRetryOpenAi(response.status)) {
            return fallbackJobKit(input);
          }

          throw new Error(`OpenAI job generation failed: ${errorText}`);
        }

        await wait(attempt * 800);
        continue;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return fallbackJobKit(input);
      }

      return normalizeJobOutput(JSON.parse(content));
    } catch (error) {
      if (attempt === 3) {
        if (
          error instanceof SyntaxError ||
          !(error instanceof Error) ||
          !error.message.startsWith("OpenAI job generation failed:")
        ) {
          return fallbackJobKit(input);
        }

        throw error;
      }

      await wait(attempt * 800);
    }
  }

  return fallbackJobKit(input);
}

export async function generateJobProfileDraft(input: JobProfileDraftInput): Promise<JobProfileDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  const companyContext = input.company_context?.scrapedText
    ? {
        selected_company: {
          name: input.company_context.name,
          url: input.company_context.url,
          description: input.company_context.description,
          scraped_urls: input.company_context.scrapedUrls
        },
        scraped_company_information: input.company_context.scrapedText
      }
    : null;

  if (!apiKey) {
    return fallbackJobProfileDraft(input);
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-5.4",
          temperature: 0.35,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You draft concise, practical hiring inputs for small business managers. Return only valid JSON matching the requested contract."
            },
            {
              role: "user",
              content: JSON.stringify({
                task:
                  companyContext
                    ? "Given a confirmed company, scraped company information, business name, and role title, draft company-grounded hiring inputs. Company values, must-have skills, nice-to-have skills, interview focus, and the job kit must be based on the scraped company information where it contains relevant evidence. If a detail is not present in the scraped information, infer conservatively from the role and clearly keep it practical rather than inventing specific company claims. Keep each list specific and short."
                    : "Given a business name and role title, infer a sensible first draft for company values, must-have skills, nice-to-have skills, interview focus, and a job kit. Keep each list specific and short.",
                contract: jobProfileDraftContract,
                input: {
                  business_name: input.business_name,
                  role_title: input.role_title,
                  location: input.location,
                  work_type: input.work_type,
                  company_context: companyContext
                }
              })
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();

        if (!shouldRetryOpenAi(response.status) || attempt === 3) {
          if (shouldRetryOpenAi(response.status)) {
            return fallbackJobProfileDraft(input);
          }

          throw new Error(`OpenAI job profile draft failed: ${errorText}`);
        }

        await wait(attempt * 800);
        continue;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return fallbackJobProfileDraft(input);
      }

      return normalizeJobProfileDraft(JSON.parse(content), input);
    } catch (error) {
      if (attempt === 3) {
        if (
          error instanceof SyntaxError ||
          !(error instanceof Error) ||
          !error.message.startsWith("OpenAI job profile draft failed:")
        ) {
          return fallbackJobProfileDraft(input);
        }

        throw error;
      }

      await wait(attempt * 800);
    }
  }

  return fallbackJobProfileDraft(input);
}

function normalizeJobOutput(value: unknown): JobGenerationOutput {
  const output = value as Partial<JobGenerationOutput>;
  const evaluationRubric = Array.isArray(output.evaluation_rubric)
    ? output.evaluation_rubric
        .map((item) => {
          const rubricItem = item as Partial<JobGenerationOutput["evaluation_rubric"][number]>;

          return {
            category: String(rubricItem.category ?? "").trim(),
            weight: Number(rubricItem.weight ?? 0),
            evidence_to_look_for: String(rubricItem.evidence_to_look_for ?? "").trim()
          };
        })
        .filter((item) => item.category || item.evidence_to_look_for)
    : [];

  return {
    job_description: String(output.job_description ?? "").trim(),
    evaluation_rubric: normalizeRubricWeights(evaluationRubric),
    interview_categories: Array.isArray(output.interview_categories)
      ? output.interview_categories.map((item) => String(item).trim()).filter(Boolean)
      : []
  };
}

function normalizeStringList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function normalizeJobProfileDraft(value: unknown, input: Pick<JobGenerationInput, "business_name" | "role_title" | "location" | "work_type">): JobProfileDraft {
  const draft = value as Partial<JobProfileDraft>;
  const normalizedInput = {
    ...input,
    company_values: normalizeStringList(draft.company_values),
    must_have_skills: normalizeStringList(draft.must_have_skills),
    nice_to_have_skills: normalizeStringList(draft.nice_to_have_skills),
    interview_focus: normalizeStringList(draft.interview_focus)
  };

  if (
    !normalizedInput.company_values.length ||
    !normalizedInput.must_have_skills.length ||
    !normalizedInput.nice_to_have_skills.length ||
    !normalizedInput.interview_focus.length
  ) {
    return fallbackJobProfileDraft(input);
  }

  return {
    company_values: normalizedInput.company_values,
    must_have_skills: normalizedInput.must_have_skills,
    nice_to_have_skills: normalizedInput.nice_to_have_skills,
    interview_focus: normalizedInput.interview_focus,
    job_output: draft.job_output ? normalizeJobOutput(draft.job_output) : fallbackJobKit(normalizedInput)
  };
}

function shouldRetryOpenAi(status: number) {
  return status === 429 || status >= 500;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function normalizeRubricWeights(rubric: JobGenerationOutput["evaluation_rubric"]) {
  if (!rubric.length) {
    return [];
  }

  if (rubric.length === 1) {
    return [{ ...rubric[0], weight: 100 }];
  }

  const total = rubric.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0);

  if (total <= 0) {
    const base = Math.floor(100 / rubric.length);
    let remainder = 100 - base * rubric.length;

    return rubric.map((item) => ({
      ...item,
      weight: base + (remainder-- > 0 ? 1 : 0)
    }));
  }

  const scaled = rubric.map((item) => {
    const exact = (Math.max(0, Number(item.weight) || 0) / total) * 100;

    return {
      item,
      floor: Math.floor(exact),
      remainder: exact - Math.floor(exact)
    };
  });
  let remaining = 100 - scaled.reduce((sum, item) => sum + item.floor, 0);
  const byRemainder = [...scaled].sort((a, b) => b.remainder - a.remainder);

  byRemainder.forEach((item) => {
    if (remaining > 0) {
      item.floor += 1;
      remaining -= 1;
    }
  });

  return scaled.map(({ item, floor }) => ({
    ...item,
    weight: floor
  }));
}

function fallbackJobKit(input: JobGenerationInput): JobGenerationOutput {
  const mustHaves = input.must_have_skills.slice(0, 3);
  const values = input.company_values.slice(0, 2);
  const focus = input.interview_focus.slice(0, 3);
  const rubricSeeds = [
    ...mustHaves.map((skill) => ({
      category: skill,
      evidence_to_look_for: `Evidence the candidate can apply ${skill.toLowerCase()} in this role.`
    })),
    ...values.map((value) => ({
      category: `${value} alignment`,
      evidence_to_look_for: `Examples that show the candidate works in a way that reflects ${value.toLowerCase()}.`
    }))
  ].slice(0, 4);
  const fallbackRubric = rubricSeeds.length
    ? rubricSeeds.map((item, index) => ({
        ...item,
        weight: index === 0 ? 35 : index === 1 ? 25 : 20
      }))
    : [
        {
          category: "Role fit",
          weight: 40,
          evidence_to_look_for: "Clear evidence the candidate can perform the main responsibilities."
        },
        {
          category: "Working style",
          weight: 30,
          evidence_to_look_for: "Examples that match the expected pace, communication style, and ownership level."
        },
        {
          category: "Values alignment",
          weight: 30,
          evidence_to_look_for: "Practical examples that match the company's values."
        }
      ];

  return {
    job_description: `${input.business_name} is hiring a ${input.role_title}${input.location ? ` in ${input.location}` : ""}${
      input.work_type ? ` (${input.work_type})` : ""
    }. The role should be assessed against the must-have skills, company values, and interview focus areas captured in the job setup.`,
    evaluation_rubric: fallbackRubric,
    interview_categories: focus.length ? focus : ["Role capability", "Working style", "Values alignment"]
  };
}

function fallbackJobProfileDraft(input: Pick<JobGenerationInput, "business_name" | "role_title" | "location" | "work_type">): JobProfileDraft {
  const role = input.role_title || "this role";
  const draftInput: JobGenerationInput = {
    ...input,
    company_values: ["Clear communication", "Reliable ownership", "Practical problem solving"],
    must_have_skills: [
      `Relevant experience in ${role}`,
      "Clear written and verbal communication",
      "Ability to manage priorities with limited supervision"
    ],
    nice_to_have_skills: ["Small business or startup experience", "Comfort with digital tools and process improvement"],
    interview_focus: ["Role-specific capability", "Ownership and prioritisation", "Working style alignment"]
  };

  return {
    company_values: draftInput.company_values,
    must_have_skills: draftInput.must_have_skills,
    nice_to_have_skills: draftInput.nice_to_have_skills,
    interview_focus: draftInput.interview_focus,
    job_output: fallbackJobKit(draftInput)
  };
}
