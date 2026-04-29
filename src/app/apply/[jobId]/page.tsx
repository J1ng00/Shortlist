import Link from "next/link";
import { notFound } from "next/navigation";

import { CandidateUploadForm } from "@/components/candidates/candidate-upload-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ApplyPageProps = {
  params: Promise<{ jobId: string }>;
};

type PublicJob = {
  id: string;
  role_title: string;
  business_name: string;
  location: string | null;
  work_type: string | null;
};

export const dynamic = "force-dynamic";

export default async function ApplyPage({ params }: ApplyPageProps) {
  const { jobId } = await params;
  const supabase = createServerSupabaseClient();
  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, role_title, business_name, location, work_type")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job) {
    notFound();
  }

  const publicJob = job as PublicJob;

  return (
    <main className="min-h-screen bg-sand px-5 py-8 text-navy sm:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <section className="pt-4">
          <p className="text-xs font-black uppercase text-ink">Shortlist application</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">{publicJob.role_title}</h1>
          <p className="mt-3 text-lg font-bold text-navy/70">{publicJob.business_name}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-navy/65">
            {publicJob.location ? <span className="rounded-full bg-white px-3 py-1">{publicJob.location}</span> : null}
            {publicJob.work_type ? <span className="rounded-full bg-white px-3 py-1">{publicJob.work_type}</span> : null}
          </div>
          <p className="mt-6 max-w-xl text-sm leading-7 text-navy/70">
            Upload your resume and add any profile links you want the hiring team to review with your application.
          </p>
          <Link
            className="mt-6 inline-flex items-center justify-center rounded-full border border-ink/20 bg-paper px-5 py-3 text-sm font-bold text-ink transition hover:border-ink/40"
            href="/jobs"
          >
            Back to saved job profiles
          </Link>
        </section>

        <section className="rounded-2xl border border-ink/10 bg-paper p-5 shadow-soft sm:p-6">
          <CandidateUploadForm
            businessName={publicJob.business_name}
            jobId={publicJob.id}
            jobTitle={publicJob.role_title}
          />
        </section>
      </div>
    </main>
  );
}
