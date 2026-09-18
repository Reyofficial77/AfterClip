import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkClipUrl } from "@/lib/url";
import { createReviewSchema } from "@/lib/validators";
import { analyzeClip, CantAccessVideoError, MalformedAIResponseError } from "@/lib/gemini";

export async function GET() {
  const projects = await prisma.clipProject.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    projects: projects.map((p: (typeof projects)[number]) => ({
      id: p.id,
      title: p.title,
      createdAt: p.createdAt,
      latest: p.versions[0]
        ? {
            id: p.versions[0].id,
            versionNumber: p.versions[0].versionNumber,
            overallScore: p.versions[0].overallScore,
            verdict: p.versions[0].verdict,
            status: p.versions[0].status,
          }
        : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { clipUrl, clipTitle, clipGoal, referenceUrl } = parsed.data;

  const urlCheck = checkClipUrl(clipUrl);
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

  // Reference URL, if given, must also be a supported/valid URL.
  if (referenceUrl && !checkClipUrl(referenceUrl).ok) {
    return NextResponse.json(
      {
        error: "invalid_reference",
        message: "The reference URL isn't a supported clip link.",
      },
      { status: 422 }
    );
  }

  const project = await prisma.clipProject.create({
    data: { title: clipTitle },
  });

  const version = await prisma.reviewVersion.create({
    data: {
      projectId: project.id,
      versionNumber: 1,
      clipUrl,
      clipTitle,
      clipGoal,
      referenceUrl: referenceUrl || null,
      platform: urlCheck.platform,
      status: "processing",
    },
  });

  try {
    const referenceCheck = referenceUrl ? checkClipUrl(referenceUrl) : null;
    const result = await analyzeClip({
      clipUrl,
      clipTitle,
      clipGoal,
      platform: urlCheck.platform,
      referenceUrl,
      referencePlatform: referenceCheck?.ok ? referenceCheck.platform : null,
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
        : "Gue nggak bisa review clip ini dengan jujur karena ada masalah pas analisis. Coba lagi ya.";

    await prisma.reviewVersion.update({
      where: { id: version.id },
      data: { status: "failed", errorMessage },
    });
  }

  return NextResponse.json({ projectId: project.id, versionId: version.id });
}
