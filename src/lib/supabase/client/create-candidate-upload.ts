export async function createCandidateUpload(payload: {
  jobId: string;
  file: File;
  githubUrl?: string;
  linkedinUrl?: string;
  manualProfileNotes?: string;
}) {
  const res = await fetch("/api/candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobId: payload.jobId,
      fileName: payload.file.name,
      fileType: payload.file.type,
      githubUrl: payload.githubUrl,
      linkedinUrl: payload.linkedinUrl,
      manualProfileNotes: payload.manualProfileNotes,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to create candidate upload");
  }

  const data = await res.json();

  const uploadRes = await fetch(data.signedUrl, {
    method: "PUT",
    body: payload.file,
    headers: {
      "Content-Type": payload.file.type || "application/pdf",
    },
  });

  if (!uploadRes.ok) {
    throw new Error("Failed to upload resume");
  }

  const processRes = await fetch(`/api/candidates/${data.candidateId}/process`, {
    method: "POST",
  });

  if (!processRes.ok) {
    throw new Error("Failed to process candidate");
  }

  return data.candidateId;
}
