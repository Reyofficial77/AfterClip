"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const GOAL_EXAMPLES = [
  "Get as many views as possible",
  "Make the clip funny",
  "Promote my podcast",
  "Make viewers watch the full video",
  "Increase engagement",
];

export default function SubmitClipPage() {
  const router = useRouter();
  const [clipUrl, setClipUrl] = useState("");
  const [clipTitle, setClipTitle] = useState("");
  const [clipGoal, setClipGoal] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clipUrl,
          clipTitle,
          clipGoal,
          referenceUrl: referenceUrl || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Something went wrong. Try again.");
        setLoading(false);
        return;
      }

      router.push(`/review/${data.projectId}`);
    } catch {
      setError("Network error. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-16">
      <Link href="/" className="text-sm text-muted hover:text-paper transition-colors">
        ← AfterClip
      </Link>

      <h1 className="font-display font-semibold text-3xl text-paper mt-6 mb-2 rise-in">
        Let&apos;s see what you&apos;ve got.
      </h1>
      <p className="text-muted mb-10 rise-in" style={{ animationDelay: "60ms" }}>
        Paste your finished clip. Be honest about the goal — that&apos;s how the review
        actually helps.
      </p>

      <form onSubmit={handleSubmit} className="space-y-7 rise-in" style={{ animationDelay: "120ms" }}>
        <Field label="Clip URL">
          <input
            required
            type="text"
            value={clipUrl}
            onChange={(e) => setClipUrl(e.target.value)}
            placeholder="Paste YouTube or TikTok link"
            className="input"
          />
        </Field>

        <Field label="Clip Title">
          <input
            required
            type="text"
            value={clipTitle}
            onChange={(e) => setClipTitle(e.target.value)}
            placeholder="Enter clip title"
            className="input"
          />
        </Field>

        <Field label="What's the goal of this clip?">
          <textarea
            required
            value={clipGoal}
            onChange={(e) => setClipGoal(e.target.value)}
            placeholder="Tell AfterClip what you want this clip to achieve"
            rows={3}
            className="input resize-none"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {GOAL_EXAMPLES.map((g) => (
              <button
                type="button"
                key={g}
                onClick={() => setClipGoal(g)}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-muted transition-all duration-150 hover:text-paper hover:border-flame hover:-translate-y-0.5 active:translate-y-0"
              >
                {g}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Reference Clip (optional)">
          <input
            type="text"
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
            placeholder="Paste reference URL"
            className="input"
          />
        </Field>

        {error && (
          <div className="rounded-lg border border-rose/40 bg-rose/5 px-4 py-3 text-sm text-rose">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-flame py-3.5 font-medium text-ink transition-all duration-200 hover:bg-flame-soft disabled:opacity-70 flex items-center justify-center gap-2.5"
        >
          {loading && (
            <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-ink/30 border-t-ink animate-spin" />
          )}
          {loading ? "Watching your clip…" : "Review Clip"}
        </button>
      </form>

      <style jsx global>{`
        .input {
          width: 100%;
          background-color: #1a1922;
          border: 1px solid #302e3b;
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          color: #f3f1ea;
          font-size: 0.9375rem;
          transition: border-color 0.15s ease;
        }
        .input::placeholder {
          color: #948fa3;
        }
        .input:focus {
          outline: none;
          border-color: #ff5a36;
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-paper/90 mb-2">{label}</span>
      {children}
    </label>
  );
}
