import { LoadingPanel } from "@/components/ui";

export default function Loading() {
  return (
    <main className="min-h-screen bg-sand text-navy shortlist-grid">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
        <LoadingPanel title="Loading page">
          Fetching the latest hiring data.
        </LoadingPanel>
      </div>
    </main>
  );
}
