import type { AIReviewResult, CategoryScores } from "@/types/review";

/**
 * ============================================================================
 * STUBBED — not a real Gemini call yet.
 * ============================================================================
 * This mimics the shape and latency of the real pipeline described in the
 * PRD (section 24-26) so every screen (processing, results, chat, revision)
 * is fully wired end-to-end. Swap `runMockAnalysis` for a real call to the
 * Google GenAI SDK when GEMINI_API_KEY is configured — keep the return type
 * identical (AIReviewResult) so nothing downstream needs to change.
 *
 * To wire up the real thing:
 *  1. `npm install @google/genai`
 *  2. Build a multimodal request that sends the video (or extracted
 *     frames/audio) plus a system prompt instructing strict JSON output
 *     matching AIReviewResult.
 *  3. Validate the response with a zod schema before trusting it — never
 *     let a malformed AI response reach the UI (PRD section 26).
 *  4. Never fabricate timestamps/audio/visual claims the model couldn't
 *     actually derive from the video (PRD section 3) — that constraint
 *     belongs in the system prompt for the real model, not just in code.
 * ============================================================================
 */

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

export type AnalysisInput = {
  clipUrl: string;
  clipTitle: string;
  clipGoal: string;
  referenceUrl?: string | null;
  /** When set, this is a revision — nudge scores upward to simulate improvement. */
  previousOverallScore?: number | null;
};

export async function runMockAnalysis(
  input: AnalysisInput
): Promise<AIReviewResult> {
  // Simulate processing latency so the "AFTERCLIP IS WATCHING..." screen
  // has something real to show.
  await new Promise((r) => setTimeout(r, 400));

  const rand = seededRandom(input.clipUrl + input.clipTitle);
  const bump = input.previousOverallScore ? 8 : 0;

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const score = (base: number, variance = 15) =>
    clamp(base + bump + (rand() - 0.5) * variance);

  const categoryScores: CategoryScores = {
    hook: score(78),
    retention: score(74),
    editing: score(80),
    subtitles: score(82),
    audio: score(79),
    storytelling: score(76),
    entertainment: score(81),
    shareability: score(73),
    goalAlignment: score(77),
  };

  const overallScore = clamp(
    Object.values(categoryScores).reduce((a, b) => a + b, 0) /
      Object.values(categoryScores).length
  );

  const viralPotential = clamp(
    (categoryScores.hook +
      categoryScores.retention +
      categoryScores.entertainment +
      categoryScores.shareability) /
      4
  );

  const verdict =
    overallScore >= 85 ? "ready" : overallScore >= 65 ? "almost" : "not_ready";

  const verdictReason =
    verdict === "ready"
      ? "Fondasinya udah kuat, nggak ada blocker besar. Beberapa hal kecil masih bisa dirapikan, tapi ini udah layak upload."
      : verdict === "almost"
      ? "Ada dua hal yang nahan clip ini dari 'ready': hook di awal masih agak lambat, dan pacing di tengah kerasa nge-drag. Beresin itu dulu."
      : "Belum siap upload. Masalah paling besar ada di 3 detik pertama — belum cukup kasih alasan buat viewer stay.";

  const strengths = [
    "Punchline di bagian akhir landing dengan baik",
    "Subtitle timing rapi, gampang dibaca sambil nonton cepat",
    "Transisi antar cut nggak bikin mata capek",
  ];

  const problems = [
    "00:03–00:06 kerasa lambat, viewer punya alasan buat scroll away",
    "Musik latar sedikit ketutupan/terlalu keras di beberapa bagian dialog",
    "Ending kurang jelas ngarahin viewer buat ngapain setelah nonton",
  ];

  const improvementPriorities = {
    high: [
      "Percepat 3 detik pertama — buang basa-basi, langsung ke bagian paling menarik",
      "Potong dead air di sekitar 00:04–00:07",
    ],
    medium: [
      "Turunin volume musik ~3-5dB pas ada dialog penting",
      "Tambahin CTA singkat di akhir sesuai goal clip",
    ],
    low: [
      "Konsistensi gaya transisi antar cut",
      "Sedikit penyesuaian framing di beberapa zoom",
    ],
  };

  const timestampFeedback = [
    {
      startTime: "00:00",
      endTime: "00:02",
      tag: "strong" as const,
      note: "Hook langsung nampilin momen paling menarik. Keep this.",
    },
    {
      startTime: "00:03",
      endTime: "00:06",
      tag: "warning" as const,
      note: "Terlalu banyak setup, coba potong ~1.5 detik.",
    },
    {
      startTime: "00:07",
      endTime: "00:11",
      tag: "good" as const,
      note: "Pacing enak, informasi mengalir natural.",
    },
    {
      startTime: "00:12",
      endTime: "00:15",
      tag: "issue" as const,
      note: "Subtitle terlalu padat buat dibaca dalam waktu segitu.",
    },
    {
      startTime: "00:16",
      endTime: "00:20",
      tag: "strong" as const,
      note: "Payoff kuat. Jangan dipotong.",
    },
  ];

  const referenceComparison = input.referenceUrl
    ? {
        matchScore: score(75, 10),
        breakdown: {
          hookStyle: score(85, 10),
          pacing: score(78, 10),
          subtitleStyle: score(74, 10),
          visualDensity: score(69, 10),
          memeUsage: score(81, 10),
          audioStyle: score(76, 10),
          energy: score(88, 10),
        },
        explanation:
          "Energi clip kamu udah mirip sama reference, tapi reference-nya ganti visual lebih agresif di 5 detik pertama. Itu salah satu alasan hook dia kerasa lebih 'nampol'.",
      }
    : null;

  return {
    overallScore,
    viralPotential,
    verdict,
    verdictReason,
    categoryScores,
    strengths,
    problems,
    improvementPriorities,
    timestampFeedback,
    referenceComparison,
  };
}

/**
 * Stubbed chat responder — answers using the actual stored review data
 * (per PRD section 19: "Do not regenerate random opinions"), not a fresh
 * random opinion. This is a simple template responder; swap for a real
 * Gemini call with the review JSON in context when ready.
 */
export function mockChatReply(question: string, review: AIReviewResult): string {
  const q = question.toLowerCase();

  if (q.includes("kenapa") || q.includes("why") || q.includes("rendah") || q.includes("low")) {
    const lowest = Object.entries(review.categoryScores).sort(
      (a, b) => a[1] - b[1]
    )[0];
    return `Skor overall ketarik turun paling banyak dari **${lowest[0]}** (${lowest[1]}/100). ${review.problems[0] ?? ""}`;
  }

  if (q.includes("hook")) {
    return `Hook kamu sekarang ${review.categoryScores.hook}/100. ${
      review.categoryScores.hook >= 85
        ? "Udah kuat, pertahanin."
        : "Coba potong basa-basi di awal dan langsung ke bagian paling menarik."
    }`;
  }

  if (q.includes("reference") || q.includes("bandingin")) {
    return review.referenceComparison
      ? review.referenceComparison.explanation
      : "Kamu belum kasih reference clip buat versi ini, jadi belum ada yang bisa dibandingin.";
  }

  if (q.includes("fix") || q.includes("prioritas") || q.includes("dulu")) {
    return `Yang paling ngaruh dulu: ${review.improvementPriorities.high.join(" — ")}`;
  }

  return `Verdict clip ini "${review.verdict}". ${review.verdictReason}`;
}
