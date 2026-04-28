import { candidateAnalysisContract } from "@/lib/ai-json-contracts";
import { candidates } from "@/lib/mock-data";

export async function POST() {
  const candidate = candidates[0];

  return Response.json({
    contract: candidateAnalysisContract,
    data: {
      extracted_skills: candidate.extractedSkills,
      strengths: candidate.strengths,
      missing_requirements: candidate.missingRequirements,
      areas_to_validate: candidate.areasToValidate,
      initial_fit_score: candidate.fitScore,
      suggested_interview_questions: candidate.suggestedInterviewQuestions
    }
  });
}
