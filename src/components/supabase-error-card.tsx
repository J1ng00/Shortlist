import { ButtonLink, Card } from "@/components/ui";

export function SupabaseErrorCard({ message }: { message: string }) {
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black">Could not load data</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
            Supabase could not be reached from the server. Check your environment variables and network access, then
            run the health check again.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/70 p-3 text-sm font-bold text-ink/70">
            {message}
          </p>
        </div>
        <ButtonLink href="/api/health/supabase">Health check</ButtonLink>
      </div>
    </Card>
  );
}
