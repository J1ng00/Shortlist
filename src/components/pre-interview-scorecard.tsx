import { Card, FitScore, Pill } from "@/components/ui";
import type { PreInterviewScorecard } from "@/lib/scorecard";

function ListBlock({
  title,
  items,
  tone = "neutral"
}: {
  title: string;
  items: string[];
  tone?: "good" | "warn" | "neutral";
}) {
  const toneClass =
    tone === "good" ? "bg-moss/10" : tone === "warn" ? "bg-clay/10" : "border border-ink/10 bg-white/70";

  return (
    <Card>
      <h2 className="text-xl font-black">{title}</h2>
      {items.length ? (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item} className={`rounded-2xl p-4 text-sm leading-6 text-ink/70 ${toneClass}`}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-2xl border border-ink/10 bg-white/70 p-4 text-sm leading-6 text-ink/60">
          No evidence captured yet.
        </p>
      )}
    </Card>
  );
}

export function PreInterviewScorecardView({ scorecard }: { scorecard: PreInterviewScorecard }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-6">
        <FitScore score={scorecard.matchScore} />
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-ink/60">Candidate profile</p>
            <Pill tone={scorecard.source === "supabase" ? "good" : "neutral"}>
              {scorecard.source === "supabase" ? "Supabase" : "Mock fallback"}
            </Pill>
          </div>
          <div className="mt-4 space-y-3 text-sm text-ink/70">
            <p>
              <strong className="text-ink">Current role:</strong> {scorecard.currentRole}
            </p>
            {scorecard.location ? (
              <p>
                <strong className="text-ink">Location:</strong> {scorecard.location}
              </p>
            ) : null}
            {scorecard.githubUrl ? (
              <p>
                <strong className="text-ink">GitHub:</strong> {scorecard.githubUrl}
              </p>
            ) : null}
            <p>
              <strong className="text-ink">Role:</strong> {scorecard.jobTitle}
            </p>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black">Pre-interview scorecard</h2>
            <Pill>{scorecard.businessName}</Pill>
          </div>
          <p className="mt-5 text-base leading-8 text-ink/75">{scorecard.summary}</p>
        </Card>

        <Card>
          <h2 className="text-xl font-black">Skill match</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {scorecard.extractedSkills.map((skill) => (
              <Pill key={skill}>{skill}</Pill>
            ))}
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <ListBlock title="Strengths" items={scorecard.strengths} tone="good" />
          <ListBlock title="Risks / concerns" items={scorecard.risks} tone="warn" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ListBlock title="Evidence found" items={scorecard.evidenceFound} tone="neutral" />
          <ListBlock title="Things to verify in interview" items={scorecard.thingsToVerify} tone="warn" />
        </div>

        <ListBlock
          title="Suggested screening questions"
          items={scorecard.suggestedScreeningQuestions}
          tone="neutral"
        />
      </div>
    </div>
  );
}
