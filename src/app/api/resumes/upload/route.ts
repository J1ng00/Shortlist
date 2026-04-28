export async function POST() {
  return Response.json({
    data: {
      bucket: "candidate-resumes",
      path: "job-ops-coordinator/cand-maya/resume.pdf",
      note: "Mock upload response. Wire this to Supabase Storage next."
    }
  });
}
