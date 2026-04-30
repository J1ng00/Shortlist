import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CandidateUploadForm } from "./candidate-upload-form";

type SavedJobOption = {
  id: string;
  role_title: string;
  business_name: string;
};

type NewCandidatePageProps = {
  searchParams: Promise<{
    jobId?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function NewCandidatePage({ searchParams }: NewCandidatePageProps) {
  const { jobId } = await searchParams;
  const supabase = createServerSupabaseClient();
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, role_title, business_name")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <PageShell
      title="Upload candidate"
      description="Add the resume PDF and optional profile context that will feed candidate analysis and interview preparation."
      prefix={
        <Link
          aria-label="Back to jobs"
          className="inline-flex text-ink transition hover:text-moss"
          href="/jobs"
          title="Back to jobs"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      }
    >
      <CandidateUploadForm jobs={(jobs ?? []) as SavedJobOption[]} selectedJobId={jobId} />
    </PageShell>
  );
}
