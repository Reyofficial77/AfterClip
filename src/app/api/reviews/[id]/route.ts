import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeVersion } from "@/lib/serialize";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = await prisma.clipProject.findUnique({
    where: { id: params.id },
    include: {
      versions: {
        orderBy: { versionNumber: "asc" },
        include: { categoryScores: true, timestampFeedback: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    id: project.id,
    title: project.title,
    versions: project.versions.map(serializeVersion),
  });
}
