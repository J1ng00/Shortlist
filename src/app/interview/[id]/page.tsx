import { InterviewWorkspace } from "@/components/interview-workspace";
import { PageShell } from "@/components/page-shell";
import { ButtonLink, Card } from "@/components/ui";
import { getInterviewBundle } from "@/lib/server-data";

type InterviewPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { id } = await params;
  const { candidate, job, session } = await getInterviewBundle(id);

  return (
    <PageShell
      eyebrow="Step 3"
      title="Interview copilot"
      description={`Live follow-up suggestions for ${candidate.name}, grounded in the ${job.title} job profile and the candidate summary.`}
      actions={<ButtonLink href={`/recommendation/${candidate.id}`}>Generate recommendation</ButtonLink>}
    >
      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/50">Candidate</p>
            <p className="mt-2 font-black">{candidate.name}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/50">Role</p>
            <p className="mt-2 font-black">{job.title}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/50">Interviewer</p>
            <p className="mt-2 font-black">{session.interviewer}</p>
          </div>
        </div>
      </Card>
      <InterviewWorkspace session={session} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="text-xl font-black">Inconsistencies to probe</h2>
          <ul className="mt-4 space-y-3">
            {session.inconsistenciesToProbe.map((item) => (
              <li key={item} className="rounded-xl border border-ink/15 bg-moss/15 p-4 text-sm leading-6 text-ink/70">
                {item}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="text-xl font-black">Missing evidence</h2>
          <ul className="mt-4 space-y-3">
            {session.missingEvidence.map((item) => (
              <li key={item} className="rounded-xl border border-line bg-sand p-4 text-sm leading-6 text-ink/70">
                {item}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="text-xl font-black">Rubric updates</h2>
          <div className="mt-4 space-y-3">
            {session.rubricUpdates.map((item) => (
              <div key={item.name} className="rounded-xl border border-line bg-sand p-4">
                <p className="font-bold">{item.name}: {item.score}/5</p>
                <p className="mt-2 text-sm leading-6 text-ink/70">{item.evidence}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
