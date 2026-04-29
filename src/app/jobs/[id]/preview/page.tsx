import { notFound } from "next/navigation";

import { ButtonLink, Card } from "@/components/ui";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PreviewJob = {
  id: string;
  role_title: string;
  business_name: string;
  location: string | null;
  work_type: string | null;
};

export const dynamic = "force-dynamic";

export default async function JobApplicationPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, role_title, business_name, location, work_type")
    .eq("id", id)
    .maybeSingle();

  if (error || !job) {
    notFound();
  }

  const previewJob = job as PreviewJob;

  return (
    <main className="min-h-screen bg-sand px-5 py-8 text-navy sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-ink">Job profile saved</p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Application preview</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-navy/70">
              This is a sample view of what applicants will see for this role.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-ink/10 bg-white/50 p-4 shadow-soft sm:p-6">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <section className="pt-4">
              <p className="text-xs font-black uppercase text-ink">Shortlist application</p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">{previewJob.role_title}</h2>
              <p className="mt-3 text-lg font-bold text-navy/70">{previewJob.business_name}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-navy/65">
                {previewJob.location ? <span className="rounded-full bg-white px-3 py-1">{previewJob.location}</span> : null}
                {previewJob.work_type ? <span className="rounded-full bg-white px-3 py-1">{previewJob.work_type}</span> : null}
              </div>
              <p className="mt-6 max-w-xl text-sm leading-7 text-navy/70">
                Upload your resume and add any profile links you want the hiring team to review with your application.
              </p>
            </section>

            <Card className="rounded-2xl bg-paper shadow-none">
              <div className="space-y-4">
                <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
                  <p className="text-xs font-black uppercase text-ink/60">Applying for</p>
                  <p className="mt-1 text-sm font-bold text-navy">
                    {previewJob.role_title} at {previewJob.business_name}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <SampleInput label="Candidate name" placeholder="Your full name" />
                  <SampleInput label="Current position" placeholder="Optional" />
                  <SampleInput label="Email" placeholder="Optional" />
                  <SampleInput label="Phone" placeholder="Optional" />
                </div>

                <SampleInput label="Resume PDF" placeholder="Choose file" />
                <SampleInput label="GitHub URL" placeholder="https://github.com/..." />
                <SampleInput label="LinkedIn URL" placeholder="https://linkedin.com/in/..." />

                <div>
                  <label className="mb-2 block text-sm font-bold text-ink">Manual profile notes</label>
                  <div className="min-h-28 rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm text-navy/40">
                    Optional notes about the candidate
                  </div>
                </div>

                <button className="rounded-2xl bg-ink px-5 py-3 text-sm font-bold text-white" disabled type="button">
                  Submit application
                </button>
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <ButtonLink href="/" variant="secondary">Back to main page</ButtonLink>
          <ButtonLink href={`/apply/${previewJob.id}`}>Open application</ButtonLink>
        </div>
      </div>
    </main>
  );
}

function SampleInput({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-ink">{label}</label>
      <div className="block w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm text-navy/40">
        {placeholder}
      </div>
    </div>
  );
}
