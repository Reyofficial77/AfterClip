import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatMessageSchema } from "@/lib/validators";
import { mockChatReply } from "@/lib/gemini";
import { serializeVersion } from "@/lib/serialize";

// Note: `id` here is a ReviewVersion id (chat is scoped to one specific
// version's review, not the whole project) — this keeps AI answers
// grounded in that version's actual data, per PRD section 19.

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const messages = await prisma.aIMessage.findMany({
    where: { versionId: params.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ messages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => null);
  const parsed = chatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const version = await prisma.reviewVersion.findUnique({
    where: { id: params.id },
    include: { categoryScores: true, timestampFeedback: true },
  });

  if (!version || version.status !== "complete") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.aIMessage.create({
    data: { versionId: version.id, role: "user", content: parsed.data.message },
  });

  const serialized = serializeVersion(version);
  const reply = mockChatReply(parsed.data.message, {
    overallScore: serialized.overallScore ?? 0,
    viralPotential: serialized.viralPotential ?? 0,
    verdict: serialized.verdict ?? "almost",
    verdictReason: serialized.verdictReason ?? "",
    categoryScores: serialized.categoryScores ?? {
      hook: 0,
      retention: 0,
      editing: 0,
      subtitles: 0,
      audio: 0,
      storytelling: 0,
      entertainment: 0,
      shareability: 0,
      goalAlignment: 0,
    },
    strengths: serialized.strengths,
    problems: serialized.problems,
    improvementPriorities: serialized.improvementPriorities,
    timestampFeedback: serialized.timestampFeedback,
    referenceComparison: serialized.referenceComparison,
  });

  const assistantMessage = await prisma.aIMessage.create({
    data: { versionId: version.id, role: "assistant", content: reply },
  });

  return NextResponse.json({ message: assistantMessage });
}
