import { notFound } from "next/navigation";

import { AskAiChat } from "@/components/candidates/ask-ai-chat";
import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AskAiPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AskAiPage({ params }: AskAiPageProps) {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from("candidates")
    .select("id, full_name, current_position, ai_candidate_output, jobs(role_title, business_name)")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const output = (data.ai_candidate_output ?? {}) as {
    extracted_profile?: {
      fullName?: string;
    };
  };
  const candidateName = output.extracted_profile?.fullName || data.full_name;
  const job = Array.isArray(data.jobs) ? data.jobs[0] : data.jobs;

  return (
    <PageShell
      eyebrow="Ask AI"
      title={candidateName}
      description={`${data.current_position ?? "Candidate"}${job?.role_title ? ` for ${job.role_title}` : ""}.`}
      actions={
        <>
          <ButtonLink href={`/candidates/${id}`} variant="secondary">Back to profile</ButtonLink>
          <ButtonLink href={`/interview/${id}`}>Start interview copilot</ButtonLink>
        </>
      }
    >
      <AskAiChat candidateId={id} candidateName={candidateName} />
    </PageShell>
  );
}
