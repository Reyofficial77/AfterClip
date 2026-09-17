import { verdictLabel, type Verdict } from "@/types/review";

const META: Record<Verdict, { emoji: string; color: string; bg: string }> = {
  ready: { emoji: "🟢", color: "#B7EE4E", bg: "rgba(183,238,78,0.08)" },
  almost: { emoji: "🟡", color: "#FFC24B", bg: "rgba(255,194,75,0.08)" },
  not_ready: { emoji: "🔴", color: "#FF4D6D", bg: "rgba(255,77,109,0.08)" },
};

export function VerdictBanner({
  verdict,
  reason,
}: {
  verdict: Verdict;
  reason: string;
}) {
  const meta = META[verdict];
  return (
    <div
      className="rounded-xl border p-5 rise-in"
      style={{ borderColor: meta.color, backgroundColor: meta.bg, animationDelay: "0.15s" }}
    >
      <div
        className="flex items-center gap-2 font-display font-semibold text-lg mb-2"
        style={{ color: meta.color }}
      >
        <span className="inline-block rise-in" style={{ animationDelay: "0.3s" }}>
          {meta.emoji}
        </span>
        <span>{verdictLabel(verdict).toUpperCase()}</span>
      </div>
      <p className="text-sm text-paper/85 leading-relaxed">{reason}</p>
    </div>
  );
}
