import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { extractPdfText } from "@/lib/pdf/extract-text";
import { extractCandidateProfile } from "@/lib/ai/extract-candidate";
import { evaluateCandidate } from "@/lib/ai/evaluate-candidate";
import { enrichGitHubProfile } from "@/lib/github/enrich-profile";

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

  const existingAiOutput = candidate.ai_candidate_output ?? {};

  await supabaseAdmin
    .from("candidates")
    .update({
      ai_candidate_output: { ...existingAiOutput, status: "processing" },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  try {
    let resumeText = candidate.resume_text;

    if (!resumeText && candidate.resume_file_path) {
      const { data: file, error: fileError } = await supabaseAdmin.storage
        .from("candidate-resumes")
        .download(candidate.resume_file_path);

      if (fileError || !file) {
        throw new Error("Resume file missing");
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      resumeText = await extractPdfText(buffer);
    }

    if (!resumeText) {
      throw new Error("Resume text missing");
    }

    const submittedApplication = candidate.ai_candidate_output?.submitted_application ?? {};
    const githubUrl = candidate.github_url ?? submittedApplication.github_url ?? null;
    const githubProfile = await enrichGitHubProfile(githubUrl);
    const evidenceContext = {
      github_profile: githubProfile,
      manual_profile_notes: candidate.manual_profile_notes ?? submittedApplication.manual_profile_notes ?? null,
    };

    const extractedProfile = await extractCandidateProfile({
      resumeText,
      githubUrl,
      githubProfile,
      linkedinUrl: candidate.linkedin_url ?? submittedApplication.linkedin_url,
      manualProfileNotes: candidate.manual_profile_notes ?? submittedApplication.manual_profile_notes,
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
          interviewFocus: candidate.jobs.interview_focus,
          companyValues: candidate.jobs.company_values,
        },
        description: candidate.jobs.ai_job_output?.job_description ?? null,
      },
      extractedProfile,
      evidenceContext,
    });
    const evidenceSnapshot = {
      submitted_application: {
        name: candidate.full_name,
        email: candidate.email,
        phone: candidate.phone,
        current_role: candidate.current_position,
        github_url: githubUrl,
        linkedin_url: candidate.linkedin_url ?? submittedApplication.linkedin_url ?? null,
        manual_profile_notes: candidate.manual_profile_notes ?? submittedApplication.manual_profile_notes ?? null,
      },
      github_profile: githubProfile,
      resume_text: resumeText,
      job_context: {
        title: candidate.jobs.role_title,
        business_name: candidate.jobs.business_name,
        requirements: {
          must_have_skills: candidate.jobs.must_have_skills,
          nice_to_have_skills: candidate.jobs.nice_to_have_skills,
          interview_focus: candidate.jobs.interview_focus,
          company_values: candidate.jobs.company_values,
        },
        description: candidate.jobs.ai_job_output?.job_description ?? null,
      },
      extracted_profile: extractedProfile,
      evaluation,
      note: "GitHub enrichment uses public GitHub API data. LinkedIn is stored as a submitted URL only; no LinkedIn scraping is performed.",
    };

    const aiCandidateOutput = {
      status: "ready",
      submitted_application: submittedApplication,
      evidence_snapshot: evidenceSnapshot,
      extracted_profile: extractedProfile,
      extracted_skills: extractedProfile.extractedSkills,
      strengths: evaluation.strengths,
      missing_requirements: evaluation.missingRequirements,
      areas_to_validate: evaluation.areasToValidate,
      suggested_screening_questions: evaluation.suggestedScreeningQuestions,
      ai_summary: evaluation.aiSummary,
      skill_match: evaluation.skillMatch,
      initial_fit_score: evaluation.fitScore,
      raw_model_output: {
        extractedProfile,
        evaluation,
      },
      updated_at: new Date().toISOString(),
    };

    await supabaseAdmin
      .from("candidates")
      .update({
        full_name: candidate.full_name,
        email: candidate.email,
        current_position: extractedProfile.currentRole || candidate.current_position,
        resume_text: resumeText,
        initial_fit_score: evaluation.fitScore,
        ai_candidate_output: aiCandidateOutput,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    revalidatePath(`/candidates/${id}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    await supabaseAdmin
      .from("candidates")
      .update({
        ai_candidate_output: {
          ...existingAiOutput,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown processing error",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown processing error",
      },
      { status: 500 }
    );
  }
}
