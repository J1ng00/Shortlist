import { PageShell } from "@/components/page-shell";
import { ButtonLink, Card, FitScore, Pill } from "@/components/ui";
import { getCandidate, getJob } from "@/lib/mock-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { analyzeCandidate } from "./actions";

type CandidatePageProps = {
  params: Promise<{
    id: string;
  }>;
};

type SavedCandidate = {
  id: string;
  job_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  current_position: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  profile_notes: string | null;
  resume_file_path: string | null;
  ai_candidate_output: {
    summary?: string;
    extracted_skills?: string[];
    strengths?: string[];
    missing_requirements?: string[];
    areas_to_validate?: string[];
    suggested_interview_questions?: string[];
  };
  initial_fit_score: number | null;
  jobs: {
    role_title: string;
    business_name: string;
  } | null;
};

type SavedCandidateRecord = Omit<SavedCandidate, "jobs"> & {
  jobs:
    | {
        role_title: string;
        business_name: string;
      }
    | Array<{
        role_title: string;
        business_name: string;
      }>
    | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { id } = await params;
  const isSavedCandidate = uuidPattern.test(id);

  if (isSavedCandidate) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("candidates")
      .select(
        "id, job_id, full_name, email, phone, current_position, github_url, linkedin_url, profile_notes, resume_file_path, ai_candidate_output, initial_fit_score, jobs(role_title, business_name)"
      )
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const record = data as unknown as SavedCandidateRecord;
    const candidate: SavedCandidate = {
      ...record,
      jobs: Array.isArray(record.jobs) ? record.jobs[0] ?? null : record.jobs
    };
    const output = candidate.ai_candidate_output ?? {};
    const extractedSkills = output.extracted_skills ?? [];
    const strengths = output.strengths ?? [];
    const missingRequirements = output.missing_requirements ?? [];
    const areasToValidate = output.areas_to_validate ?? [];
    const fitScore = candidate.initial_fit_score ?? 0;
    const hasAnalysis = Boolean(candidate.initial_fit_score || output.summary);
    const jobTitle = candidate.jobs?.role_title ?? "the selected role";
    const businessName = candidate.jobs?.business_name ?? "the business";

    return (
      <PageShell
        eyebrow="Step 2"
        title={candidate.full_name}
        description={`Candidate review for ${jobTitle} at ${businessName}. The resume is stored in Supabase and ready for analysis.`}
        actions={
          <>
            <form action={analyzeCandidate}>
              <input type="hidden" name="candidate_id" value={candidate.id} />
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-paper transition hover:bg-moss"
                type="submit"
              >
                {hasAnalysis ? "Refresh analysis" : "Analyze CV"}
              </button>
            </form>
            <ButtonLink href={`/interview/${candidate.id}`}>Start interview copilot</ButtonLink>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-6">
            <FitScore score={fitScore} />
            <Card>
              <p className="text-sm font-bold text-ink/60">Candidate profile</p>
              <div className="mt-4 space-y-3 text-sm text-ink/70">
                {candidate.current_position ? (
                  <p>
                    <strong className="text-ink">Current role:</strong> {candidate.current_position}
                  </p>
                ) : null}
                {candidate.email ? (
                  <p>
                    <strong className="text-ink">Email:</strong> {candidate.email}
                  </p>
                ) : null}
                {candidate.phone ? (
                  <p>
                    <strong className="text-ink">Phone:</strong> {candidate.phone}
                  </p>
                ) : null}
                {candidate.github_url ? (
                  <p>
                    <strong className="text-ink">GitHub:</strong> {candidate.github_url}
                  </p>
                ) : null}
                {candidate.linkedin_url ? (
                  <p>
                    <strong className="text-ink">LinkedIn:</strong> {candidate.linkedin_url}
                  </p>
                ) : null}
                {candidate.resume_file_path ? (
                  <p>
                    <strong className="text-ink">CV path:</strong> {candidate.resume_file_path}
                  </p>
                ) : null}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-black">AI candidate summary</h2>
                <Pill>{hasAnalysis ? "OpenAI analysis" : "Pending analysis"}</Pill>
              </div>
              <p className="mt-5 text-base leading-8 text-ink/75">
                {output.summary ??
                  "The CV upload is saved. Connect resume text extraction and candidate analysis to replace this pending state with an AI-generated scorecard."}
              </p>
            </Card>

            {candidate.profile_notes ? (
              <Card>
                <h2 className="text-xl font-black">Manager notes</h2>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink/70">{candidate.profile_notes}</p>
              </Card>
            ) : null}

            <Card>
              <h2 className="text-xl font-black">Extracted skills</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {extractedSkills.length ? extractedSkills.map((skill) => <Pill key={skill}>{skill}</Pill>) : <Pill>Not analyzed yet</Pill>}
              </div>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <h2 className="text-xl font-black">Strengths</h2>
                <ul className="mt-4 space-y-3">
                  {strengths.length ? (
                    strengths.map((highlight) => (
                      <li key={highlight} className="rounded-2xl bg-moss/10 p-4 text-sm leading-6 text-ink/70">
                        {highlight}
                      </li>
                    ))
                  ) : (
                    <li className="rounded-2xl bg-moss/10 p-4 text-sm leading-6 text-ink/70">Not analyzed yet.</li>
                  )}
                </ul>
              </Card>
              <Card>
                <h2 className="text-xl font-black">Missing requirements</h2>
                <ul className="mt-4 space-y-3">
                  {missingRequirements.length ? (
                    missingRequirements.map((risk) => (
                      <li key={risk} className="rounded-2xl bg-clay/10 p-4 text-sm leading-6 text-ink/70">
                        {risk}
                      </li>
                    ))
                  ) : (
                    <li className="rounded-2xl bg-clay/10 p-4 text-sm leading-6 text-ink/70">Not analyzed yet.</li>
                  )}
                </ul>
              </Card>
            </div>

            <Card>
              <h2 className="text-xl font-black">Areas to validate</h2>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {areasToValidate.length ? (
                  areasToValidate.map((area) => (
                    <li key={area} className="rounded-2xl border border-ink/10 bg-white/70 p-4 text-sm leading-6 text-ink/70">
                      {area}
                    </li>
                  ))
                ) : (
                  <li className="rounded-2xl border border-ink/10 bg-white/70 p-4 text-sm leading-6 text-ink/70">
                    Not analyzed yet.
                  </li>
                )}
              </ul>
            </Card>
          </div>
        </div>
      </PageShell>
    );
  }

  const candidate = getCandidate(id);
  const job = getJob(candidate.jobId);

  return (
    <PageShell
      eyebrow="Step 2"
      title={candidate.name}
      description={`AI-generated candidate summary for ${job.title} at ${job.businessName}. This screen uses mock resume data now and can later connect to Supabase Storage + OpenAI extraction.`}
      actions={<ButtonLink href={`/interview/${candidate.id}`}>Start interview copilot</ButtonLink>}
    >
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <FitScore score={candidate.fitScore} />
          <Card>
            <p className="text-sm font-bold text-ink/60">Candidate profile</p>
            <div className="mt-4 space-y-3 text-sm text-ink/70">
              <p>
                <strong className="text-ink">Current role:</strong> {candidate.currentRole}
              </p>
              <p>
                <strong className="text-ink">Experience:</strong> {candidate.experienceYears} years
              </p>
              <p>
                <strong className="text-ink">Location:</strong> {candidate.location}
              </p>
              {candidate.githubUrl ? (
                <p>
                  <strong className="text-ink">GitHub:</strong> {candidate.githubUrl}
                </p>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-black">AI candidate summary</h2>
              <Pill>Mock resume parse</Pill>
            </div>
            <p className="mt-5 text-base leading-8 text-ink/75">{candidate.aiSummary}</p>
          </Card>

          <Card>
            <h2 className="text-xl font-black">Extracted skills</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {candidate.extractedSkills.map((skill) => (
                <Pill key={skill}>{skill}</Pill>
              ))}
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h2 className="text-xl font-black">Strengths</h2>
              <ul className="mt-4 space-y-3">
                {candidate.strengths.map((highlight) => (
                  <li key={highlight} className="rounded-2xl bg-moss/10 p-4 text-sm leading-6 text-ink/70">
                    {highlight}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h2 className="text-xl font-black">Missing requirements</h2>
              <ul className="mt-4 space-y-3">
                {candidate.missingRequirements.map((risk) => (
                  <li key={risk} className="rounded-2xl bg-clay/10 p-4 text-sm leading-6 text-ink/70">
                    {risk}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card>
            <h2 className="text-xl font-black">Areas to validate</h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {candidate.areasToValidate.map((area) => (
                <li key={area} className="rounded-2xl border border-ink/10 bg-white/70 p-4 text-sm leading-6 text-ink/70">
                  {area}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
