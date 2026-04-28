import { interviewCopilotContract } from "@/lib/ai-json-contracts";
import { interviewSessions } from "@/lib/mock-data";

export async function POST() {
  const session = interviewSessions[0];

  return Response.json({
    contract: interviewCopilotContract,
    data: {
      follow_up_questions: session.suggestedQuestions,
      inconsistencies_to_probe: session.inconsistenciesToProbe,
      rubric_score_updates: session.rubricUpdates.map((item) => ({
        category: item.name,
        score: item.score,
        evidence: item.evidence
      })),
      missing_evidence: session.missingEvidence
    }
  });
}
