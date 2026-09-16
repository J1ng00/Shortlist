import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/ui";
import { getSupabaseErrorMessage } from "@/lib/supabase/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ThankYouPageProps = {
  params: Promise<{ jobId: string }>;
};

type PublicJob = {
  role_title: string;
  business_name: string;
};

export const dynamic = "force-dynamic";

export default async function ApplicationThankYouPage({ params }: ThankYouPageProps) {
  const { jobId } = await params;
  let job: unknown = null;
  let loadError: string | null = null;

  try {
    const supabase = createServerSupabaseClient();
    const result = await supabase
      .from("jobs")
      .select("role_title, business_name")
      .eq("id", jobId)
      .maybeSingle();

    if (result.error) {
      loadError = result.error.message;
    } else {
      job = result.data;
    }
  } catch (error) {
    loadError = getSupabaseErrorMessage(error);
    console.error("Application thank-you page failed to load job:", error);
  }

  if (loadError) {
    return <PublicSupabaseError message={loadError} />;
  }

  if (!job) {
    notFound();
  }

  const publicJob = job as PublicJob;

  return (
    <main className="min-h-screen bg-sand px-5 py-10 text-navy sm:px-8">
      <section className="mx-auto max-w-2xl rounded-3xl border border-ink/10 bg-paper p-8 shadow-soft">
        <p className="text-xs font-black uppercase text-ink">Application submitted</p>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">Thank you</h1>
        <p className="mt-4 text-base leading-7 text-navy/70">
          Your application for {publicJob.role_title} at {publicJob.business_name} has been received.
        </p>
        <p className="mt-3 text-sm leading-6 text-navy/60">
          We are preparing your application for the hiring team now. You can close this page.
        </p>
      </section>
    </main>
  );
}

function PublicSupabaseError({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-sand px-5 py-10 text-navy sm:px-8">
      <section className="mx-auto max-w-2xl rounded-3xl border border-ink/10 bg-paper p-8 shadow-soft">
        <p className="text-xs font-black uppercase text-ink">Application status unavailable</p>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">Could not load confirmation</h1>
        <p className="mt-4 text-sm leading-7 text-navy/70">
          Supabase could not be reached from the server. Check the app configuration, then try the health check.
        </p>
        <p className="mt-4 rounded-xl border border-line bg-white/70 p-3 text-sm font-bold text-ink/70">
          {message}
        </p>
        <div className="mt-6">
          <ButtonLink href="/api/health/supabase">Health check</ButtonLink>
        </div>
      </section>
    </main>
  );
}
