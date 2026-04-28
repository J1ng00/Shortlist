import { finalDecisionContract } from "@/lib/ai-json-contracts";
import { recommendations } from "@/lib/mock-data";

export async function POST() {
  const recommendation = recommendations[0];

  return Response.json({
    contract: finalDecisionContract,
    data: {
      recommendation: recommendation.decision,
      confidence: recommendation.confidence,
      supporting_evidence: recommendation.supportingEvidence,
      concerns: recommendation.concerns,
      next_step: recommendation.nextStep
    }
  });
}
