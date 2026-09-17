"use client";

import { useEffect, useState } from "react";
import type { CategoryScores } from "@/types/review";

const LABELS: Record<keyof CategoryScores, string> = {
  hook: "Hook",
  retention: "Retention",
  editing: "Editing",
  subtitles: "Subtitles",
  audio: "Audio",
  storytelling: "Storytelling",
  entertainment: "Entertainment",
  shareability: "Shareability",
  goalAlignment: "Goal Alignment",
};

const ORDER = Object.keys(LABELS) as (keyof CategoryScores)[];

function barColor(score: number) {
  if (score >= 90) return "#FF5A36";
  if (score >= 80) return "#B7EE4E";
  if (score >= 70) return "#FFC24B";
  if (score >= 60) return "#FF9B4B";
  return "#FF4D6D";
}

export function CategoryBars({ scores }: { scores: CategoryScores }) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="space-y-4">
      {ORDER.map((key, i) => {
        const value = scores[key];
        return (
          <div key={key}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm text-paper/90 font-medium">{LABELS[key]}</span>
              <span className="text-sm font-mono text-muted tabular-nums">
                {filled ? value : 0}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: filled ? `${value}%` : "0%",
                  backgroundColor: barColor(value),
                  transition: `width 0.8s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
