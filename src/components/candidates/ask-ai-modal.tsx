"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";

import { LoadingPanel } from "@/components/ui";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AskAiModalProps = {
  candidateId: string;
  candidateName: string;
};

const STARTERS = [
  "Biggest risks?",
  "Evidence to progress?",
  "Next interview question?"
];

export function AskAiModal({ candidateId, candidateName }: AskAiModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Ask about ${candidateName}'s evidence, risks, strengths, or next interview step.`
    }
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
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: nextMessages.slice(-8)
        })
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
    <>
      <button
        aria-label="Ask AI about this candidate"
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-clay/70 bg-ink text-paper shadow-strong ring-4 ring-clay/20 transition hover:-translate-y-0.5 hover:border-clay hover:bg-navy hover:ring-clay/35"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Bot className="h-6 w-6" />
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-navy/35 p-4 backdrop-blur-sm sm:p-6">
          <section className="flex h-[min(680px,calc(100vh-3rem))] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-ink/20 bg-paper shadow-strong">
            <div className="flex items-center justify-between gap-4 border-b border-paper/15 bg-ink px-5 py-4 text-paper">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper text-ink">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black uppercase text-paper/70">Ask AI</p>
                  <h2 className="truncate text-lg font-black text-paper">{candidateName}</h2>
                </div>
              </div>
              <button
                aria-label="Close Ask AI"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-paper/20 text-paper transition hover:bg-paper hover:text-ink"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-ink/10 bg-white px-5 py-3">
              <div className="flex gap-2 overflow-x-auto">
                {STARTERS.map((starter) => (
                  <button
                    className="shrink-0 rounded-full border border-ink/20 bg-paper px-3 py-2 text-xs font-black text-ink transition hover:bg-clay/60 disabled:opacity-60"
                    disabled={isSending}
                    key={starter}
                    onClick={() => void submitMessage(starter)}
                    type="button"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              {messages.map((message, index) => (
                <div className={message.role === "user" ? "flex justify-end" : "flex justify-start"} key={`${message.role}-${index}`}>
                  <div
                    className={
                      message.role === "user"
                        ? "max-w-[86%] whitespace-pre-wrap rounded-3xl bg-ink px-5 py-4 text-sm font-bold leading-7 text-paper"
                        : "max-w-[86%] whitespace-pre-wrap rounded-3xl border border-ink/15 bg-white px-5 py-4 text-sm leading-7 text-navy/80"
                    }
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isSending ? (
                <LoadingPanel className="bg-white text-left" title="Generating answer">
                  Reading candidate evidence and interview context.
                </LoadingPanel>
              ) : null}
            </div>

            <form className="border-t border-ink/15 bg-white p-4" onSubmit={handleSubmit}>
              {error ? <p className="mb-3 rounded-2xl bg-clay/35 px-4 py-3 text-sm font-bold text-navy">{error}</p> : null}
              <div className="flex items-end gap-3">
                <textarea
                  className="min-h-12 flex-1 resize-none rounded-2xl border border-ink/20 bg-paper px-4 py-3 text-sm font-bold leading-6 text-navy outline-none transition placeholder:text-navy/45 focus:border-ink"
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask about evidence, risks, or next steps..."
                  rows={2}
                  value={input}
                />
                <button
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canSend}
                  type="submit"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
