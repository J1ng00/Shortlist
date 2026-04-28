import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const body = await req.json();

  const {
    jobId,
    fileName,
    fileType,
    githubUrl,
    fullName,
    email,
    phone,
    currentPosition,
  } = body;

  if (!jobId || !fileName) {
    return NextResponse.json({ error: "jobId and fileName are required" }, { status: 400 });
  }

  if (fileType && fileType !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF resumes are supported" }, { status: 400 });
  }

  const candidateId = randomUUID();
  const safeFileName = fileName.replace(/\s+/g, "-").toLowerCase();
  const storagePath = `${jobId}/${candidateId}/${safeFileName}`;

  const { error: insertError } = await supabaseAdmin.from("candidates").insert({
    id: candidateId,
    job_id: jobId,
    full_name: fullName || "Unnamed candidate",
    email: email || null,
    phone: phone || null,
    current_position: currentPosition || null,
    github_url: githubUrl || null,
    resume_file_path: storagePath,
    stage: "review",
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data, error: uploadError } = await supabaseAdmin.storage
    .from("candidate-resumes")
    .createSignedUploadUrl(storagePath);

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  return NextResponse.json({
    candidateId,
    path: storagePath,
    signedUrl: data.signedUrl,
    token: data.token,
  });
}
