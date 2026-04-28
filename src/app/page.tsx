import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, FileText, MessageSquareText, Stamp } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { ButtonLink, Card, FitScore, Pill } from "@/components/ui";
import { candidates, getJob } from "@/lib/mock-data";

const candidate = candidates[0];
const job = getJob(candidate.jobId);

const flow = [
  {
    title: "Create job profile",
    description: "Capture role details, values, skills, and interview focus.",
    href: "/jobs/new",
    icon: BriefcaseBusiness
  },
  {
    title: "Review candidate",
    description: "Show skills, strengths, missing requirements, and fit score.",
    href: `/candidates/${candidate.id}`,
    icon: FileText
  },
  {
    title: "Run interview copilot",
    description: "Use notes to suggest practical follow-up questions.",
    href: `/interview/${candidate.id}`,
    icon: MessageSquareText
  },
  {
    title: "Generate memo",
    description: "Produce a concise recommendation managers can act on.",
    href: `/recommendation/${candidate.id}`,
    icon: Stamp
  }
];

export default function Home() {
  return (
    <PageShell
      eyebrow="Hackathon MVP"
      title="A practical hiring copilot for small business managers"
      description="Move from job profile to candidate summary, live interview follow-ups, and a final hiring memo with a tight mock-data flow."
      actions={
        <>
          <ButtonLink href="/jobs/new">Start job profile</ButtonLink>
          <ButtonLink href={`/candidates/${candidate.id}`} variant="secondary">
            View demo candidate
          </ButtonLink>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="good">Demo path ready</Pill>
            <Pill>Mock AI outputs</Pill>
            <Pill>No auth yet</Pill>
          </div>
          <h2 className="mt-5 text-3xl font-black tracking-tight">Core flow</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {flow.map((step) => {
              const Icon = step.icon;
              return (
                <Link
                  key={step.title}
                  href={step.href}
                  className="group rounded-3xl border border-ink/10 bg-white/60 p-5 transition hover:-translate-y-0.5 hover:border-clay/40 hover:shadow-soft"
                >
                  <Icon className="h-7 w-7 text-clay" />
                  <h3 className="mt-4 text-lg font-black">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/60">{step.description}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-moss">
                    Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6">
          <FitScore score={candidate.fitScore} />
          <Card>
            <p className="text-sm font-bold text-ink/60">Current demo</p>
            <h2 className="mt-1 text-2xl font-black">{candidate.name}</h2>
            <p className="mt-2 text-sm text-ink/60">
              {candidate.currentRole} for {job.title}
            </p>
            <p className="mt-5 text-sm leading-6 text-ink/70">{candidate.aiSummary}</p>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
