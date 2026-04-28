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

  await supabaseAdmin
    .from("candidates")
    .update({ status: "processing" })
    .eq("id", id);

  const { data: candidate, error: candidateError } = await supabaseAdmin
    .from("candidates")
    .select("*, jobs(*)")
    .eq("id", id)
    .single();

  if (candidateError || !candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const { data: file, error: fileError } = await supabaseAdmin.storage
    .from("candidate-files")
    .download(candidate.resume_path);

  if (fileError || !file) {
    await supabaseAdmin
      .from("candidates")
      .update({ status: "failed" })
      .eq("id", id);

    return NextResponse.json({ error: "Resume file missing" }, { status: 500 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const resumeText = await extractPdfText(buffer);

    const extractedProfile = await extractCandidateProfile({
      resumeText,
      githubUrl: candidate.github_url,
      linkedinUrl: candidate.linkedin_url,
      manualProfileNotes: candidate.manual_profile_notes,
      jobTitle: candidate.jobs.title,
      companyName: candidate.jobs.business_name,
    });

    const evaluation = await evaluateCandidate({
      job: {
        title: candidate.jobs.title,
        businessName: candidate.jobs.business_name,
        requirements: candidate.jobs.requirements,
        description: candidate.jobs.description,
      },
      extractedProfile,
    });

    await supabaseAdmin.from("candidate_ai_results").upsert({
      candidate_id: id,
      extracted_profile: extractedProfile,
      extracted_skills: extractedProfile.extractedSkills,
      strengths: evaluation.strengths,
      missing_requirements: evaluation.missingRequirements,
      areas_to_validate: evaluation.areasToValidate,
      suggested_screening_questions: evaluation.suggestedScreeningQuestions,
      ai_summary: evaluation.aiSummary,
      skill_match: evaluation.skillMatch,
      raw_model_output: {
        extractedProfile,
        evaluation,
      },
      updated_at: new Date().toISOString(),
    });

    await supabaseAdmin
      .from("candidates")
      .update({
        name: extractedProfile.fullName,
        current_role: extractedProfile.currentRole,
        location: extractedProfile.location,
        experience_years: extractedProfile.experienceYears,
        fit_score: evaluation.fitScore,
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    revalidatePath(`/candidates/${id}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    await supabaseAdmin
      .from("candidates")
      .update({ status: "failed" })
      .eq("id", id);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown processing error",
      },
      { status: 500 }
    );
  }
}