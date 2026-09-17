import type { TimestampFeedbackItem, TimestampTag } from "@/types/review";

const TAG_META: Record<TimestampTag, { emoji: string; color: string }> = {
  strong: { emoji: "🔥", color: "#FF5A36" },
  good: { emoji: "🟢", color: "#B7EE4E" },
  warning: { emoji: "⚠️", color: "#FFC24B" },
  issue: { emoji: "🔴", color: "#FF4D6D" },
};

export function TimestampList({ items }: { items: TimestampFeedbackItem[] }) {
  return (
    <ol className="space-y-0">
      {items.map((item, i) => {
        const meta = TAG_META[item.tag];
        return (
          <li
            key={i}
            className="flex gap-4 pb-5 last:pb-0 rise-in"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <div className="flex flex-col items-center pt-0.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: meta.color }}
              />
              {i < items.length - 1 && (
                <span className="w-px flex-1 bg-border mt-1" />
              )}
            </div>
            <div className="pb-1">
              <div className="font-mono text-xs text-muted mb-1">
                {item.startTime}–{item.endTime}
              </div>
              <p className="text-sm text-paper/90 leading-relaxed">
                <span className="mr-1">{meta.emoji}</span>
                {item.note}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
