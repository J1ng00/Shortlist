"use client";

import { useState } from "react";

import { Card, Pill } from "@/components/ui";
import type { InterviewSession } from "@/lib/types";

const extraQuestions = [
  "What would your previous manager say is your biggest operating risk?",
  "Walk me through how you decide what is urgent versus merely noisy.",
  "How do you document handovers so nothing is missed?"
];

export function InterviewWorkspace({ session }: { session: InterviewSession }) {
  const [notes, setNotes] = useState(session.notes);

  const generatedQuestions = notes.toLowerCase().includes("conflict")
    ? [
        "Describe a workplace conflict you handled directly. What changed afterward?",
        ...session.suggestedQuestions.slice(0, 2)
      ]
    : [...session.suggestedQuestions, extraQuestions[0]];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink/60">Live notes</p>
            <h2 className="mt-1 text-2xl font-black">Interview transcript pad</h2>
          </div>
          <Pill>Mock AI</Pill>
        </div>
        <textarea
          className="mt-5 min-h-80 w-full resize-none rounded-2xl border border-ink/10 bg-white/70 p-4 leading-7 outline-none ring-clay/20 transition focus:border-clay focus:ring-4"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </Card>

      <Card>
        <p className="text-sm font-bold text-ink/60">Suggested follow-ups</p>
        <h2 className="mt-1 text-2xl font-black">Ask next</h2>
        <div className="mt-5 space-y-3">
          {generatedQuestions.map((question) => (
            <div key={question} className="rounded-xl border border-line bg-sand p-4">
              <p className="text-sm leading-6 text-ink/75">{question}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-ink/60">
          For the hackathon demo, these update from deterministic mock logic. Later this becomes an
          OpenAI call using the job profile, resume summary, and current notes.
        </p>
      </Card>
    </div>
  );
}
