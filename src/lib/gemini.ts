import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { AIReviewResult } from "@/types/review";
import type { Platform } from "@/lib/url";

/**
 * ============================================================================
 * REAL Gemini integration.
 * ============================================================================
 * Uses Gemini's native YouTube-URL support (Gemini can be pointed at a
 * public YouTube URL directly via `fileData` — no download/upload step
 * needed on our side): https://ai.google.dev/gemini-api/docs/video-understanding
 *
 * IMPORTANT — honesty constraint (PRD section 3): Gemini's direct-URL video
 * support only covers YouTube. There is no equivalent for TikTok without
 * building our own video-retrieval pipeline (download + upload via the
 * Files API), which isn't implemented here. So for TikTok clips we do NOT
 * fake an analysis — analyzeClip() throws a CantAccessVideoError and the
 * API routes surface that honestly instead of a review.
 *
 * If GEMINI_API_KEY isn't set at all, we fall back to the deterministic
 * mock (runMockAnalysis below) so local dev / testing still works without
 * a key.
 * ============================================================================
 */

export class CantAccessVideoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CantAccessVideoError";
  }
}

export class MalformedAIResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MalformedAIResponseError";
  }
}

const YOUTUBE_URL_SUPPORTED: Platform[] = ["youtube", "youtube_shorts"];

function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function getModel(): string {
  return process.env.GEMINI_MODEL || "gemini-3.5-flash";
}

// ---------------------------------------------------------------------------
// Zod schema mirroring AIReviewResult (src/types/review.ts). Every Gemini
// response is validated against this before it's ever allowed to reach the
// UI or the database — malformed output is treated as a failure, never
// silently patched or guessed at (PRD section 26).
// ---------------------------------------------------------------------------

const categoryScoresSchema = z.object({
  hook: z.number().min(0).max(100),
  retention: z.number().min(0).max(100),
  editing: z.number().min(0).max(100),
  subtitles: z.number().min(0).max(100),
  audio: z.number().min(0).max(100),
  storytelling: z.number().min(0).max(100),
  entertainment: z.number().min(0).max(100),
  shareability: z.number().min(0).max(100),
  goalAlignment: z.number().min(0).max(100),
});

const timestampFeedbackSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  tag: z.enum(["strong", "good", "warning", "issue"]),
  note: z.string(),
});

const referenceComparisonSchema = z
  .object({
    matchScore: z.number().min(0).max(100),
    breakdown: z.object({
      hookStyle: z.number().min(0).max(100),
      pacing: z.number().min(0).max(100),
      subtitleStyle: z.number().min(0).max(100),
      visualDensity: z.number().min(0).max(100),
      memeUsage: z.number().min(0).max(100),
      audioStyle: z.number().min(0).max(100),
      energy: z.number().min(0).max(100),
    }),
    explanation: z.string(),
  })
  .nullable();

const aiReviewResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  viralPotential: z.number().min(0).max(100),
  verdict: z.enum(["ready", "almost", "not_ready"]),
  verdictReason: z.string(),
  categoryScores: categoryScoresSchema,
  strengths: z.array(z.string()),
  problems: z.array(z.string()),
  improvementPriorities: z.object({
    high: z.array(z.string()),
    medium: z.array(z.string()),
    low: z.array(z.string()),
  }),
  timestampFeedback: z.array(timestampFeedbackSchema),
  referenceComparison: referenceComparisonSchema,
});

export type AnalysisInput = {
  clipUrl: string;
  clipTitle: string;
  clipGoal: string;
  platform: Platform;
  referenceUrl?: string | null;
  referencePlatform?: Platform | null;
  /** When set, this is a revision — the model is told the previous score. */
  previousOverallScore?: number | null;
};

const SYSTEM_INSTRUCTION = `You are AfterClip, an AI clip reviewer for short-form video creators (YouTube Shorts / TikTok clippers).

CORE PHILOSOPHY — BE HONEST. Do not flatter the user. If the clip is bad, say so clearly, but never insult the person — be direct about the work, never mean about them. Never claim certainty about virality; viral_potential is always an estimate.

PERSONALITY: casual, modern, Gen-Z, Indonesian slang where natural, direct, occasionally funny, never toxic, never stiff/corporate. Write verdictReason, strengths, problems, improvementPriorities, and timestampFeedback notes in the same voice a sharp, funny, brutally honest senior video editor friend would use (Indonesian, mixing in English words the way Indonesian creators do — this is normal and expected, not a mistake).

NEVER invent timestamps, visual events, or audio details you can't actually verify from the video. Base every timestamp-specific note on something you can actually see/hear.

Respond with STRICT JSON ONLY, matching exactly this shape (no markdown fences, no commentary outside the JSON):
{
  "overallScore": number 0-100,
  "viralPotential": number 0-100,
  "verdict": "ready" | "almost" | "not_ready",
  "verdictReason": string,
  "categoryScores": { "hook": number, "retention": number, "editing": number, "subtitles": number, "audio": number, "storytelling": number, "entertainment": number, "shareability": number, "goalAlignment": number },
  "strengths": string[],
  "problems": string[] (ordered by impact, most important first),
  "improvementPriorities": { "high": string[], "medium": string[], "low": string[] },
  "timestampFeedback": [ { "startTime": "mm:ss", "endTime": "mm:ss", "tag": "strong"|"good"|"warning"|"issue", "note": string } ],
  "referenceComparison": null OR { "matchScore": number, "breakdown": { "hookStyle": number, "pacing": number, "subtitleStyle": number, "visualDensity": number, "memeUsage": number, "audioStyle": number, "energy": number }, "explanation": string }
}

Verdict thresholds: overallScore >= 85 => "ready", >= 65 => "almost", otherwise "not_ready".
Set "referenceComparison" to null unless a second (reference) video was actually provided to you — never fabricate a comparison to a video you weren't given.`;

function buildPrompt(input: AnalysisInput): string {
  const lines = [
    `Clip title: ${input.clipTitle}`,
    `Creator's stated goal for this clip: ${input.clipGoal}`,
  ];
  if (input.previousOverallScore != null) {
    lines.push(
      `This is a REVISION of a previous cut, which scored ${input.previousOverallScore}/100 overall. Evaluate this new version on its own merits, then let verdictReason note whether/how it improved.`
    );
  }
  if (input.referenceUrl && input.referencePlatform && YOUTUBE_URL_SUPPORTED.includes(input.referencePlatform)) {
    lines.push(
      "A reference clip was also provided (second video attached) — compare hook, pacing, editing, subtitle style, visual density, meme usage, audio, energy, and structure against it, and fill in referenceComparison. Do not encourage the creator to copy it — the comparison is for learning."
    );
  } else {
    lines.push(
      "No usable reference video was provided — set referenceComparison to null."
    );
  }
  lines.push(
    "Now watch the attached video and produce the JSON review described in your instructions."
  );
  return lines.join("\n");
}

/**
 * Real Gemini analysis. Throws CantAccessVideoError if the platform isn't
 * one Gemini can access directly (TikTok today), and MalformedAIResponseError
 * if the model's output doesn't validate against our schema.
 */
export async function analyzeClipWithGemini(
  input: AnalysisInput
): Promise<AIReviewResult> {
  if (!YOUTUBE_URL_SUPPORTED.includes(input.platform)) {
    throw new CantAccessVideoError(
      "Gue nggak bisa review clip ini dengan jujur karena videonya nggak bisa gue akses. AfterClip saat ini cuma bisa nonton clip YouTube/YouTube Shorts secara langsung — dukungan TikTok butuh langkah download video yang belum diimplementasikan."
    );
  }

  const ai = getClient();
  if (!ai) {
    // No API key configured — caller decides whether to fall back to mock.
    throw new Error("GEMINI_API_KEY is not set");
  }

  const parts: Array<Record<string, unknown>> = [
    { fileData: { fileUri: input.clipUrl } },
  ];

  if (
    input.referenceUrl &&
    input.referencePlatform &&
    YOUTUBE_URL_SUPPORTED.includes(input.referencePlatform)
  ) {
    parts.push({ fileData: { fileUri: input.referenceUrl } });
  }

  parts.push({ text: buildPrompt(input) });

  let responseText: string;
  try {
    const response = await ai.models.generateContent({
      model: getModel(),
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });
    responseText = response.text ?? "";
  } catch (err) {
    throw new CantAccessVideoError(
      "Gue nggak bisa review clip ini dengan jujur karena videonya nggak bisa gue akses (mungkin private, kepanjangan, atau kehapus)."
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new MalformedAIResponseError(
      "AI response wasn't valid JSON — refusing to show an unverified review."
    );
  }

  const result = aiReviewResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new MalformedAIResponseError(
      `AI response didn't match the expected schema: ${result.error.message}`
    );
  }

  return result.data;
}

/**
 * Chat, grounded in the stored review data for this specific version
 * (PRD section 19: "don't regenerate random opinions"). Text-only call —
 * no re-analysis of the video.
 */
export async function chatWithGemini(
  question: string,
  review: AIReviewResult,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const ai = getClient();
  if (!ai) return mockChatReply(question, review);

  const context = `Here is the stored AfterClip review data for this clip, in JSON. Answer the creator's question using ONLY this data — do not invent new critique or re-imagine the video. Keep the same honest, casual, Gen-Z Indonesian voice as the review itself.\n\n${JSON.stringify(
    review
  )}`;

  try {
    const response = await ai.models.generateContent({
      model: getModel(),
      contents: [
        ...history.map((h) => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        })),
        { role: "user", parts: [{ text: question }] },
      ],
      config: {
        systemInstruction: context,
        temperature: 0.7,
      },
    });
    return response.text ?? mockChatReply(question, review);
  } catch {
    return "Gue lagi ada gangguan buat jawab pertanyaan ini, coba lagi sebentar lagi ya.";
  }
}

// ---------------------------------------------------------------------------
// Deterministic mock — used only as a fallback when GEMINI_API_KEY isn't
// configured, so local dev/testing still works without a key. Never used
// silently in production: callers log/flag when they fall back to this.
// ---------------------------------------------------------------------------

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

export async function runMockAnalysis(
  input: AnalysisInput
): Promise<AIReviewResult> {
  await new Promise((r) => setTimeout(r, 400));

  const rand = seededRandom(input.clipUrl + input.clipTitle);
  const bump = input.previousOverallScore ? 8 : 0;

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const score = (base: number, variance = 15) =>
    clamp(base + bump + (rand() - 0.5) * variance);

  const categoryScores = {
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
      ? "[MOCK — no GEMINI_API_KEY set] Fondasinya udah kuat, nggak ada blocker besar."
      : verdict === "almost"
      ? "[MOCK — no GEMINI_API_KEY set] Hook di awal masih agak lambat, dan pacing di tengah kerasa nge-drag."
      : "[MOCK — no GEMINI_API_KEY set] Masalah paling besar ada di 3 detik pertama.";

  return {
    overallScore,
    viralPotential,
    verdict,
    verdictReason,
    categoryScores,
    strengths: [
      "Punchline di bagian akhir landing dengan baik",
      "Subtitle timing rapi",
      "Transisi antar cut nggak bikin mata capek",
    ],
    problems: [
      "00:03–00:06 kerasa lambat",
      "Musik latar sedikit ketutupan/terlalu keras di beberapa bagian dialog",
      "Ending kurang jelas ngarahin viewer",
    ],
    improvementPriorities: {
      high: ["Percepat 3 detik pertama", "Potong dead air di sekitar 00:04–00:07"],
      medium: ["Turunin volume musik ~3-5dB pas ada dialog penting"],
      low: ["Konsistensi gaya transisi antar cut"],
    },
    timestampFeedback: [
      { startTime: "00:00", endTime: "00:02", tag: "strong", note: "[MOCK] Hook langsung nampilin momen paling menarik." },
      { startTime: "00:03", endTime: "00:06", tag: "warning", note: "[MOCK] Terlalu banyak setup." },
    ],
    referenceComparison: input.referenceUrl
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
          explanation: "[MOCK — no GEMINI_API_KEY set] Placeholder comparison.",
        }
      : null,
  };
}

/**
 * Entry point API routes should call. Real Gemini when GEMINI_API_KEY is
 * set (throws CantAccessVideoError for TikTok, or MalformedAIResponseError
 * on bad output — callers should surface these as an honest failure, not
 * paper over them). Falls back to the mock only when no key is configured.
 */
export async function analyzeClip(input: AnalysisInput): Promise<AIReviewResult> {
  if (!process.env.GEMINI_API_KEY) {
    return runMockAnalysis(input);
  }
  return analyzeClipWithGemini(input);
}

/**
 * Stubbed template chat responder (fallback when no API key is set).
 */
export function mockChatReply(question: string, review: AIReviewResult): string {
  const q = question.toLowerCase();

  if (q.includes("kenapa") || q.includes("why") || q.includes("rendah") || q.includes("low")) {
    const lowest = Object.entries(review.categoryScores).sort((a, b) => a[1] - b[1])[0];
    return `[MOCK] Skor overall ketarik turun paling banyak dari **${lowest[0]}** (${lowest[1]}/100). ${review.problems[0] ?? ""}`;
  }
  if (q.includes("hook")) {
    return `[MOCK] Hook kamu sekarang ${review.categoryScores.hook}/100.`;
  }
  if (q.includes("fix") || q.includes("prioritas") || q.includes("dulu")) {
    return `[MOCK] Yang paling ngaruh dulu: ${review.improvementPriorities.high.join(" — ")}`;
  }
  return `[MOCK] Verdict clip ini "${review.verdict}". ${review.verdictReason}`;
}
