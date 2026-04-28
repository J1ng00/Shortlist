import { jobGenerationContract } from "@/lib/ai-json-contracts";
import { jobs } from "@/lib/mock-data";

export async function POST() {
  const job = jobs[0];

  return Response.json({
    contract: jobGenerationContract,
    data: {
      job_description: job.generatedJobDescription,
      evaluation_rubric: job.evaluationRubric.map((item) => ({
        category: item.name,
        weight: item.weight,
        evidence_to_look_for: item.evidence
      })),
      interview_categories: job.interviewCategories
    }
  });
}
