import { randomUUID } from "crypto";
import { after, NextResponse } from "next/server";

import { extractPdfText } from "@/lib/pdf/extract-text";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function optionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length ? value : null;
}

function optionalUrl(formData: FormData, key: string) {
  const value = optionalText(formData, key);

  if (!value) {
    return null;
  }

  try {
    return new URL(value).toString();
  } catch {
    throw new Error(`${key.replace("_", " ")} must be a valid URL, including https://.`);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const supabase = createServerSupabaseClient();
    const jobId = optionalText(formData, "job_id");
    const fullName = optionalText(formData, "full_name");
    const resume = formData.get("resume");

    if (!jobId) {
      return NextResponse.json({ error: "Missing job id." }, { status: 400 });
    }

    if (!fullName) {
      return NextResponse.json({ error: "Candidate name is required." }, { status: 400 });
    }

    if (!(resume instanceof File) || resume.size === 0) {
      return NextResponse.json({ error: "Resume PDF is required." }, { status: 400 });
    }

    const isPdf = resume.type === "application/pdf" || resume.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return NextResponse.json({ error: "Resume must be a PDF." }, { status: 400 });
    }

    const candidateId = randomUUID();
    const notes = optionalText(formData, "manual_profile_notes");
    const githubUrl = optionalUrl(formData, "github_url");
    const linkedinUrl = optionalUrl(formData, "linkedin_url");
    const resumeBuffer = Buffer.from(await resume.arrayBuffer());
    const resumeText = await extractPdfText(resumeBuffer);

    if (!resumeText) {
      return NextResponse.json({ error: "Could not extract text from the uploaded resume PDF." }, { status: 400 });
    }

    const { error: insertError } = await supabase.from("candidates").insert({
      id: candidateId,
      job_id: jobId,
      full_name: fullName,
      email: optionalText(formData, "email"),
      phone: optionalText(formData, "phone"),
      current_position: optionalText(formData, "current_position"),
      github_url: githubUrl,
      resume_text: resumeText,
      ai_candidate_output: {
        status: "processing",
        submitted_application: {
          github_url: githubUrl,
          linkedin_url: linkedinUrl,
          manual_profile_notes: notes,
        },
      },
      stage: "review",
    });

    if (insertError) {
      console.error("Candidate application insert failed", insertError);

      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    after(async () => {
      try {
        const { analyzeCandidateById } = await import("@/lib/candidate-analysis");

        await analyzeCandidateById(supabase, candidateId);
      } catch (analysisError) {
        await supabase
          .from("candidates")
          .update({
            ai_candidate_output: {
              status: "analysis_failed",
              submitted_application: {
                github_url: githubUrl,
                linkedin_url: linkedinUrl,
                manual_profile_notes: notes,
              },
              analysis_error: analysisError instanceof Error ? analysisError.message : "Candidate analysis failed.",
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", candidateId);
      }
    });

    return NextResponse.json({ candidateId, processing: true }, { status: 202 });
  } catch (error) {
    console.error("Candidate application failed", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Candidate application failed." },
      { status: 500 }
    );
  }
}
