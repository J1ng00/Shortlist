"use client";

import { FormEvent, useMemo, useState } from "react";
import { Send, Sparkles } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AskAiChatProps = {
  candidateId: string;
  candidateName: string;
};

const STARTERS = [
  "What are the biggest hiring risks for this candidate?",
  "Summarize the raw evidence in plain English.",
  "What should I ask in the next interview?",
];

export function AskAiChat({ candidateId, candidateName }: AskAiChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Ask me about ${candidateName}'s resume, application notes, GitHub enrichment, job fit, or interview plan.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  async function submitMessage(nextInput?: string) {
    const question = (nextInput ?? input).trim();

    if (!question || isSending) {
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/candidates/${candidateId}/ask-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.slice(-8),
        }),
      });
      const responseText = await response.text();
      const data = responseText
        ? (JSON.parse(responseText) as { answer?: string; error?: string })
        : { error: "Ask AI returned an empty response." };

      if (!response.ok) {
        throw new Error(data.error ?? "Ask AI failed.");
      }

      setMessages((current) => [...current, { role: "assistant", content: data.answer ?? "I could not generate a response." }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ask AI failed.");
      setMessages(messages);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage();
  }

  return (
    <div className="grid h-[calc(100vh-220px)] min-h-[560px] overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-soft lg:grid-cols-[280px_1fr]">
      <aside className="overflow-y-auto border-b border-line bg-moss/15 p-5 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-paper">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black uppercase text-ink">Ask AI</p>
            <p className="text-sm font-bold text-navy/60">{candidateName}</p>
          </div>
        </div>
        <div className="mt-6 space-y-2">
          {STARTERS.map((starter) => (
            <button
              className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-left text-sm font-bold leading-6 text-navy transition hover:border-ink/25 hover:bg-white disabled:opacity-60"
              disabled={isSending}
              key={starter}
              onClick={() => void submitMessage(starter)}
              type="button"
            >
              {starter}
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col bg-paper">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((message, index) => (
            <div
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
              key={`${message.role}-${index}`}
            >
              <div
                className={
                  message.role === "user"
                    ? "max-w-[85%] whitespace-pre-wrap rounded-3xl bg-ink px-5 py-4 text-sm font-bold leading-7 text-paper"
                    : "max-w-[85%] whitespace-pre-wrap rounded-3xl border border-line bg-white px-5 py-4 text-sm leading-7 text-navy/80"
                }
              >
                {message.content}
              </div>
            </div>
          ))}
          {isSending ? (
            <div className="max-w-[85%] rounded-3xl border border-line bg-white px-5 py-4 text-sm font-bold text-navy/60">
              Thinking...
            </div>
          ) : null}
        </div>

        <form className="border-t border-line bg-white p-4" onSubmit={handleSubmit}>
          {error ? <p className="mb-3 rounded-2xl bg-clay/25 px-4 py-3 text-sm font-bold text-navy">{error}</p> : null}
          <div className="flex items-end gap-3">
            <textarea
              className="min-h-14 flex-1 resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-sm font-bold leading-6 text-navy outline-none transition placeholder:text-navy/40 focus:border-ink/35"
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about evidence, risks, strengths, or interview questions..."
              rows={2}
              value={input}
            />
            <button
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSend}
              type="submit"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
