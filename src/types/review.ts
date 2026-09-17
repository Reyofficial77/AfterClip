export type Verdict = "ready" | "almost" | "not_ready";

export type CategoryScores = {
  hook: number;
  retention: number;
  editing: number;
  subtitles: number;
  audio: number;
  storytelling: number;
  entertainment: number;
  shareability: number;
  goalAlignment: number;
};

export type TimestampTag = "strong" | "good" | "warning" | "issue";

export type TimestampFeedbackItem = {
  startTime: string;
  endTime: string;
  tag: TimestampTag;
  note: string;
};

export type ImprovementPriorities = {
  high: string[];
  medium: string[];
  low: string[];
};

export type ReferenceComparison = {
  matchScore: number;
  breakdown: {
    hookStyle: number;
    pacing: number;
    subtitleStyle: number;
    visualDensity: number;
    memeUsage: number;
    audioStyle: number;
    energy: number;
  };
  explanation: string;
} | null;

// Shape returned by the (stubbed) AI analysis pipeline. This mirrors the
// PRD's "Structured AI Output" schema in section 26.
export type AIReviewResult = {
  overallScore: number;
  viralPotential: number;
  verdict: Verdict;
  verdictReason: string;
  categoryScores: CategoryScores;
  strengths: string[];
  problems: string[];
  improvementPriorities: ImprovementPriorities;
  timestampFeedback: TimestampFeedbackItem[];
  referenceComparison: ReferenceComparison;
};

export function scoreTier(score: number): {
  label: string;
  emoji: string;
  tone: "flame" | "lime" | "amber" | "rose";
} {
  if (score >= 90) return { label: "Excellent", emoji: "🔥", tone: "flame" };
  if (score >= 80) return { label: "Good", emoji: "🟢", tone: "lime" };
  if (score >= 70) return { label: "Decent", emoji: "🟡", tone: "amber" };
  if (score >= 60) return { label: "Needs Work", emoji: "🟠", tone: "amber" };
  return { label: "Not Ready", emoji: "🔴", tone: "rose" };
}

export function verdictLabel(verdict: Verdict): string {
  switch (verdict) {
    case "ready":
      return "Ready to Post";
    case "almost":
      return "Almost There";
    case "not_ready":
      return "Not Ready";
  }
}
