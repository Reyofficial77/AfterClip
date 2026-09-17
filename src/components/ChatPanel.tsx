"use client";

import { useState } from "react";

type Message = { id: string; role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Why is my score low?",
  "How can I make the hook stronger?",
  "What should I fix first?",
];

export function ChatPanel({
  versionId,
  initialMessages,
}: {
  versionId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setSending(true);
    setInput("");
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content: text }]);

    try {
      const res = await fetch(`/api/reviews/${versionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((m) => [...m, data.message]);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-panel flex flex-col h-[480px]">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-display font-medium text-paper">Ask AfterClip</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-muted transition-all duration-150 hover:text-paper hover:border-flame hover:-translate-y-0.5"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`text-sm leading-relaxed max-w-[85%] rounded-lg px-3.5 py-2.5 bubble-in ${
              m.role === "user"
                ? "ml-auto bg-flame text-ink"
                : "bg-surface text-paper/90"
            }`}
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div className="bg-surface text-muted text-sm rounded-lg px-3.5 py-2.5 max-w-[85%] bubble-in flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-muted watching-dot" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-muted watching-dot" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-muted watching-dot" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="p-3 border-t border-border flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your review…"
          className="flex-1 bg-surface border border-border rounded-lg px-3.5 py-2.5 text-sm text-paper placeholder:text-muted focus:outline-none focus:border-flame transition-colors"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-flame px-4 text-sm font-medium text-ink transition-all duration-150 hover:bg-flame-soft active:scale-95 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
