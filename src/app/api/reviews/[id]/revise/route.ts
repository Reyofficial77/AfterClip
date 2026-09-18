import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkClipUrl } from "@/lib/url";
import { reviseReviewSchema } from "@/lib/validators";
import { analyzeClip, CantAccessVideoError, MalformedAIResponseError } from "@/lib/gemini";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => null);
  const parsed = reviseReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const project = await prisma.clipProject.findUnique({
    where: { id: params.id },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });

  if (!project || project.versions.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const previous = project.versions[0];

  const urlCheck = checkClipUrl(parsed.data.clipUrl);
  if (!urlCheck.ok) {
    return NextResponse.json(
      {
        error: urlCheck.reason,
        message:
          urlCheck.reason === "unsupported"
            ? "AfterClip currently supports YouTube and TikTok."
            : "That doesn't look like a valid URL.",
      },
      { status: 422 }
    );
  }

  const version = await prisma.reviewVersion.create({
    data: {
      projectId: project.id,
      versionNumber: previous.versionNumber + 1,
      clipUrl: parsed.data.clipUrl,
      clipTitle: previous.clipTitle,
      clipGoal: previous.clipGoal,
      referenceUrl: previous.referenceUrl,
      platform: urlCheck.platform,
      status: "processing",
    },
  });

  try {
    const referenceCheck = previous.referenceUrl ? checkClipUrl(previous.referenceUrl) : null;
    const result = await analyzeClip({
      clipUrl: parsed.data.clipUrl,
      clipTitle: previous.clipTitle,
      clipGoal: previous.clipGoal,
      platform: urlCheck.platform,
      referenceUrl: previous.referenceUrl,
      referencePlatform: referenceCheck?.ok ? referenceCheck.platform : null,
      previousOverallScore: previous.overallScore,
    });

    await prisma.reviewVersion.update({
      where: { id: version.id },
      data: {
        status: "complete",
        overallScore: result.overallScore,
        viralPotential: result.viralPotential,
        verdict: result.verdict,
        verdictReason: result.verdictReason,
        strengths: JSON.stringify(result.strengths),
        problems: JSON.stringify(result.problems),
        improvementPriorities: JSON.stringify(result.improvementPriorities),
        referenceComparison: result.referenceComparison
          ? JSON.stringify(result.referenceComparison)
          : null,
        categoryScores: { create: result.categoryScores },
        timestampFeedback: {
          create: result.timestampFeedback.map((t, i) => ({
            startTime: t.startTime,
            endTime: t.endTime,
            tag: t.tag,
            note: t.note,
            order: i,
          })),
        },
      },
    });
  } catch (err) {
    const errorMessage =
      err instanceof CantAccessVideoError
        ? err.message
        : err instanceof MalformedAIResponseError
        ? "AI ngasih hasil yang nggak valid, jadi AfterClip nggak nampilin review yang belum diverifikasi. Coba lagi ya."
        : "Analisis gagal. Coba submit ulang ya.";

    await prisma.reviewVersion.update({
      where: { id: version.id },
      data: { status: "failed", errorMessage },
    });
  }

  return NextResponse.json({ projectId: project.id, versionId: version.id });
}
