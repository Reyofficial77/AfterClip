import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeVersion } from "@/lib/serialize";
import { ScoreRing } from "@/components/ScoreRing";
import { CategoryBars } from "@/components/CategoryBars";
import { TimestampList } from "@/components/TimestampList";
import { VerdictBanner } from "@/components/VerdictBanner";
import { VersionProgress } from "@/components/VersionProgress";
import { ChatPanel } from "@/components/ChatPanel";
import { ReviseForm } from "@/components/ReviseForm";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { v?: string };
}) {
  const project = await prisma.clipProject.findUnique({
    where: { id: params.id },
    include: {
      versions: {
        orderBy: { versionNumber: "asc" },
        include: { categoryScores: true, timestampFeedback: true },
      },
    },
  });

  if (!project || project.versions.length === 0) notFound();

  const requestedVersion = searchParams.v ? Number(searchParams.v) : null;
  const rawVersion =
    (requestedVersion &&
      project.versions.find(
        (v: (typeof project.versions)[number]) => v.versionNumber === requestedVersion
      )) ||
    project.versions[project.versions.length - 1];

  const version = serializeVersion(rawVersion);

  if (version.status === "failed") {
    return (
      <main className="max-w-xl mx-auto px-6 py-24 text-center">
        <div className="text-3xl mb-4">🔒</div>
        <h1 className="font-display font-semibold text-2xl text-paper mb-2">
          Can&apos;t review this version
        </h1>
        <p className="text-muted mb-8">
          {version.errorMessage ?? "Something went wrong analyzing this clip."}
        </p>
        <Link
          href="/submit"
          className="inline-flex items-center rounded-lg bg-flame px-5 py-2.5 text-sm font-medium text-ink hover:bg-flame-soft transition-colors"
        >
          Try another clip
        </Link>
      </main>
    );
  }

  if (version.status !== "complete" || !version.categoryScores) {
    const steps = [
      "Accessing clip",
      "Understanding context",
      "Analyzing opening",
      "Checking pacing",
      "Estimating viral potential",
    ];
    return (
      <main className="max-w-md mx-auto px-6 py-28 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-flame watching-dot" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-flame watching-dot" style={{ animationDelay: "200ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-flame watching-dot" style={{ animationDelay: "400ms" }} />
        </div>
        <div className="font-mono text-sm text-paper/80 mb-8 tracking-wide">
          AFTERCLIP IS WATCHING…
        </div>
        <ul className="text-left space-y-2.5">
          {steps.map((s, i) => (
            <li
              key={s}
              className="text-sm text-muted font-mono flex items-center gap-2 rise-in"
              style={{ animationDelay: `${300 + i * 220}ms` }}
            >
              <span className="text-lime">✓</span>
              {s}
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const rawMessages = await prisma.aIMessage.findMany({
    where: { versionId: version.id },
    orderBy: { createdAt: "asc" },
  });
  // Prisma types `role` as a plain string (the schema stores it as String,
  // not an enum); narrow it here to the union ChatPanel expects.
  const messages = rawMessages.map((m: (typeof rawMessages)[number]) => ({
    id: m.id,
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <Link href="/dashboard" className="text-sm text-muted hover:text-paper transition-colors">
          ← Dashboard
        </Link>
        <span className="text-xs font-mono text-muted">
          Version {version.versionNumber}
        </span>
      </div>

      <h1 className="font-display font-semibold text-2xl text-paper mb-8 rise-in">
        {version.clipTitle}
      </h1>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="rounded-xl border border-border bg-panel p-6 flex flex-col items-center justify-center rise-in">
          <div className="text-xs font-mono text-muted mb-4 tracking-wide self-start">
            AFTERCLIP SCORE
          </div>
          <ScoreRing score={version.overallScore!} size={150} />
        </div>

        <div className="rounded-xl border border-border bg-panel p-6 rise-in" style={{ animationDelay: "80ms" }}>
          <div className="text-xs font-mono text-muted mb-4 tracking-wide">
            🔥 VIRAL POTENTIAL
          </div>
          <div className="font-mono text-4xl text-paper mb-1 tabular-nums">
            {version.viralPotential}
            <span className="text-lg text-muted">/100</span>
          </div>
          <p className="text-xs text-muted leading-relaxed mt-3">
            Viral potential is an AI estimate, not a guarantee of views.
          </p>
        </div>

        <VerdictBanner verdict={version.verdict!} reason={version.verdictReason ?? ""} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Category Breakdown">
            <CategoryBars scores={version.categoryScores} />
          </Section>

          <Section title="⏱️ Timestamp Review">
            <TimestampList items={version.timestampFeedback} />
          </Section>

          <div className="grid sm:grid-cols-2 gap-6">
            <Section title="🔥 What You Did Well">
              <ul className="space-y-2.5">
                {version.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-paper/85 flex gap-2">
                    <span className="text-lime">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="⚠️ What Needs Work">
              <ol className="space-y-2.5">
                {version.problems.map((p, i) => (
                  <li key={i} className="text-sm text-paper/85 flex gap-2">
                    <span className="text-muted font-mono">{i + 1}.</span>
                    {p}
                  </li>
                ))}
              </ol>
            </Section>
          </div>

          <Section title="Improvement Priority">
            <div className="space-y-5">
              <PriorityGroup label="🔴 High Impact" color="#FF4D6D" items={version.improvementPriorities.high} />
              <PriorityGroup label="🟡 Medium Impact" color="#FFC24B" items={version.improvementPriorities.medium} />
              <PriorityGroup label="🟢 Low Impact" color="#B7EE4E" items={version.improvementPriorities.low} />
            </div>
          </Section>

          {version.referenceComparison && (
            <Section title="Reference Match">
              <div className="flex items-center gap-4 mb-5">
                <span className="font-mono text-3xl text-paper">
                  {version.referenceComparison.matchScore}
                </span>
                <span className="text-muted text-sm">/ 100</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5">
                {Object.entries(version.referenceComparison.breakdown).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="text-muted capitalize">
                      {k.replace(/([A-Z])/g, " $1")}
                    </span>
                    <span className="font-mono text-paper/85">{v}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-paper/80 leading-relaxed border-t border-border pt-4">
                {version.referenceComparison.explanation}
              </p>
            </Section>
          )}

          <ReviseForm projectId={project.id} />
        </div>

        <div className="space-y-6">
          <VersionProgress
            versions={project.versions.map((v: (typeof project.versions)[number]) => ({
              id: v.id,
              versionNumber: v.versionNumber,
              overallScore: v.overallScore,
              status: v.status,
            }))}
            activeId={version.id}
            projectId={project.id}
          />
          <ChatPanel versionId={version.id} initialMessages={messages} />
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-6 rise-in transition-colors duration-300 hover:border-[#3D3B49]">
      <h2 className="font-display font-medium text-paper mb-5">{title}</h2>
      {children}
    </div>
  );
}

function PriorityGroup({
  label,
  color,
  items,
}: {
  label: string;
  color: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-sm font-medium mb-2.5" style={{ color }}>
        {label}
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-paper/85 pl-4 border-l-2" style={{ borderColor: color + "50" }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
