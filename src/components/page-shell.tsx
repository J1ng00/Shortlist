import Link from "next/link";
import type { ReactNode } from "react";

type PageShellProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function PageShell({ eyebrow, title, description, actions, children }: PageShellProps) {
  return (
    <main className="min-h-screen bg-sand text-ink">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-6 rounded-[2rem] border border-ink/10 bg-paper/90 p-6 shadow-soft sm:p-8">
          <nav className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link href="/" className="font-semibold tracking-tight text-ink">
              AI Hiring Copilot
            </Link>
            <div className="flex gap-3 text-ink/60">
              <Link className="hover:text-ink" href="/jobs/new">
                Job
              </Link>
              <Link className="hover:text-ink" href="/candidates/cand-maya">
                Candidate
              </Link>
              <Link className="hover:text-ink" href="/interview/cand-maya">
                Interview
              </Link>
              <Link className="hover:text-ink" href="/recommendation/cand-maya">
                Memo
              </Link>
            </div>
          </nav>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              {eyebrow ? (
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-clay">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="text-4xl font-black tracking-tight text-ink sm:text-5xl">{title}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink/70">{description}</p>
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
