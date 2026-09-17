"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviseForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clipUrl, setClipUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/reviews/${projectId}/revise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clipUrl }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.message ?? "Couldn't submit that version. Try again.");
      setLoading(false);
      return;
    }

    router.refresh();
    setOpen(false);
    setLoading(false);
    setClipUrl("");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-border py-3 text-sm font-medium text-paper/90 transition-all duration-150 hover:border-flame hover:-translate-y-0.5"
      >
        Submit revised version
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rise-in">
      <input
        required
        autoFocus
        value={clipUrl}
        onChange={(e) => setClipUrl(e.target.value)}
        placeholder="Paste the link to your edited clip"
        className="w-full bg-surface border border-border rounded-lg px-3.5 py-2.5 text-sm text-paper placeholder:text-muted focus:outline-none focus:border-flame transition-colors"
      />
      {error && <p className="text-xs text-rose rise-in">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-flame py-2.5 text-sm font-medium text-ink transition-all duration-150 hover:bg-flame-soft disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && (
            <span className="inline-block w-3 h-3 rounded-full border-2 border-ink/30 border-t-ink animate-spin" />
          )}
          {loading ? "Reviewing new version…" : "Review New Version"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-4 text-sm text-muted hover:text-paper transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
