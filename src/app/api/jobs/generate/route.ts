import { jobProfileDraftContract } from "@/lib/ai-json-contracts";
import { generateJobProfileDraft, type JobGenerationInput } from "@/lib/job-ai";

export async function POST(request: Request) {
  const input = (await request.json()) as JobGenerationInput;
  const data = await generateJobProfileDraft({
    business_name: input.business_name,
    role_title: input.role_title,
    location: input.location,
    work_type: input.work_type
  });

  return Response.json({
    contract: jobProfileDraftContract,
    data
  });
}
