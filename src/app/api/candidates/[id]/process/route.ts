import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { extractPdfText } from "@/lib/pdf/extract-text";
import { extractCandidateProfile } from "../../../../../lib/ai/extract-candidate";
import { evaluateCandidate } from "@/lib/ai/evaluate-candidate";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { id } = await context.params;

  const { data: candidate, error: candidateError } = await supabaseAdmin
    .from("candidates")
    .select("*, jobs(*)")
    .eq("id", id)
    .single();

  if (candidateError || !candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const { data: file, error: fileError } = await supabaseAdmin.storage
    .from("candidate-resumes")
    .download(candidate.resume_file_path);

  if (fileError || !file) {
    return NextResponse.json({ error: "Resume file missing" }, { status: 500 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const resumeText = await extractPdfText(buffer);

    const extractedProfile = await extractCandidateProfile({
      resumeText,
      githubUrl: candidate.github_url,
      jobTitle: candidate.jobs.role_title,
      companyName: candidate.jobs.business_name,
    });

    const evaluation = await evaluateCandidate({
      job: {
        title: candidate.jobs.role_title,
        businessName: candidate.jobs.business_name,
        requirements: {
          mustHaveSkills: candidate.jobs.must_have_skills,
          niceToHaveSkills: candidate.jobs.nice_to_have_skills,
          companyValues: candidate.jobs.company_values,
          interviewFocus: candidate.jobs.interview_focus,
          rubric: candidate.jobs.ai_job_output?.evaluation_rubric ?? []
        },
        description: candidate.jobs.ai_job_output?.job_description,
      },
      extractedProfile,
    });

    await supabaseAdmin
      .from("candidates")
      .update({
        full_name: extractedProfile.fullName || candidate.full_name,
        email: extractedProfile.email || candidate.email,
        current_position: extractedProfile.currentRole || candidate.current_position,
        resume_text: resumeText,
        initial_fit_score: evaluation.fitScore,
        stage: "interview",
        ai_candidate_output: {
          extracted_skills: extractedProfile.extractedSkills,
          strengths: evaluation.strengths,
          missing_requirements: evaluation.missingRequirements,
          areas_to_validate: evaluation.areasToValidate,
          suggested_interview_questions: evaluation.suggestedScreeningQuestions.map((item: { question: string }) => item.question),
          ai_summary: evaluation.aiSummary,
          skill_match: evaluation.skillMatch,
          location: extractedProfile.location,
          experience_years: extractedProfile.experienceYears,
          raw_model_output: {
            extractedProfile,
            evaluation,
          }
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    await supabaseAdmin.from("interview_sessions").insert({
      candidate_id: id,
      notes: "",
      ai_interview_output: {
        follow_up_questions: evaluation.suggestedScreeningQuestions.map((item: { question: string }) => item.question),
        inconsistencies_to_probe: [],
        missing_evidence: evaluation.areasToValidate,
        rubric_score_updates: []
      },
    });

    revalidatePath(`/candidates/${id}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown processing error",
      },
      { status: 500 }
    );
  }
}
