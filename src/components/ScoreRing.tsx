"use client";

import { useEffect, useRef, useState } from "react";
import { scoreTier } from "@/types/review";

const TONE_HEX: Record<string, string> = {
  flame: "#FF5A36",
  lime: "#B7EE4E",
  amber: "#FFC24B",
  rose: "#FF4D6D",
};

export function ScoreRing({
  score,
  size = 180,
  label,
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const tier = scoreTier(score);
  const color = TONE_HEX[tier.tone];
  const stroke = size * 0.07;
  const radius = size / 2 - stroke;
  const circumference = 2 * Math.PI * radius;

  const [display, setDisplay] = useState(0);
  const frame = useRef<number>();

  useEffect(() => {
    const duration = 900;
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * score));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    }

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  const offset = circumference * (1 - display / 100);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#302E3B"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono font-semibold text-paper tabular-nums"
            style={{ fontSize: size * 0.24 }}
          >
            {display}
          </span>
          <span className="text-muted text-xs font-mono">/ 100</span>
        </div>
      </div>
      <div
        className="flex items-center gap-1.5 text-sm font-medium rise-in"
        style={{ color, animationDelay: "0.5s" }}
      >
        <span>{tier.emoji}</span>
        <span>{label ?? tier.label}</span>
      </div>
    </div>
  );
}
