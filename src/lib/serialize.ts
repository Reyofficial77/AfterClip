import type {
  ReviewVersion,
  TimestampCategoryScore,
  TimestampFeedback,
} from "@prisma/client";
import type {
  CategoryScores,
  ImprovementPriorities,
  ReferenceComparison,
  TimestampFeedbackItem,
} from "@/types/review";

type FullVersion = ReviewVersion & {
  categoryScores: TimestampCategoryScore | null;
  timestampFeedback: TimestampFeedback[];
};

export function serializeVersion(v: FullVersion) {
  const categoryScores: CategoryScores | null = v.categoryScores
    ? {
        hook: v.categoryScores.hook,
        retention: v.categoryScores.retention,
        editing: v.categoryScores.editing,
        subtitles: v.categoryScores.subtitles,
        audio: v.categoryScores.audio,
        storytelling: v.categoryScores.storytelling,
        entertainment: v.categoryScores.entertainment,
        shareability: v.categoryScores.shareability,
        goalAlignment: v.categoryScores.goalAlignment,
      }
    : null;

  const timestampFeedback: TimestampFeedbackItem[] = v.timestampFeedback
    .sort((a, b) => a.order - b.order)
    .map((t) => ({
      startTime: t.startTime,
      endTime: t.endTime,
      tag: t.tag as TimestampFeedbackItem["tag"],
      note: t.note,
    }));

  return {
    id: v.id,
    projectId: v.projectId,
    versionNumber: v.versionNumber,
    clipUrl: v.clipUrl,
    clipTitle: v.clipTitle,
    clipGoal: v.clipGoal,
    referenceUrl: v.referenceUrl,
    platform: v.platform,
    status: v.status,
    errorMessage: v.errorMessage,
    overallScore: v.overallScore,
    viralPotential: v.viralPotential,
    verdict: v.verdict as "ready" | "almost" | "not_ready" | null,
    verdictReason: v.verdictReason,
    strengths: (v.strengths ? JSON.parse(v.strengths) : []) as string[],
    problems: (v.problems ? JSON.parse(v.problems) : []) as string[],
    improvementPriorities: (v.improvementPriorities
      ? JSON.parse(v.improvementPriorities)
      : { high: [], medium: [], low: [] }) as ImprovementPriorities,
    referenceComparison: (v.referenceComparison
      ? JSON.parse(v.referenceComparison)
      : null) as ReferenceComparison,
    categoryScores,
    timestampFeedback,
    createdAt: v.createdAt,
  };
}

export type SerializedVersion = ReturnType<typeof serializeVersion>;
