import { jobGenerationContract } from "@/lib/ai-json-contracts";
import { generateJobKit, type JobGenerationInput } from "@/lib/job-ai";

export async function POST(request: Request) {
  const input = (await request.json()) as JobGenerationInput;
  const data = await generateJobKit(input);

  return Response.json({
    contract: jobGenerationContract,
    data
  });
}
