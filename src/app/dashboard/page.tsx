import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { scoreTier } from "@/types/review";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = await prisma.clipProject.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-10 rise-in">
        <Link href="/" className="font-display font-semibold text-lg text-paper">
          AfterClip
        </Link>
        <Link
          href="/submit"
          className="inline-flex items-center gap-2 rounded-lg bg-flame px-5 py-2.5 text-sm font-medium text-ink transition-all duration-200 hover:bg-flame-soft hover:-translate-y-0.5"
        >
          + Review New Clip
        </Link>
      </div>

      <h1 className="font-display font-semibold text-2xl text-paper mb-6 rise-in" style={{ animationDelay: "60ms" }}>
        Recent Reviews
      </h1>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-border border-dashed p-10 text-center rise-in" style={{ animationDelay: "120ms" }}>
          <p className="text-muted mb-5">No reviews yet. Submit your first clip.</p>
          <Link
            href="/submit"
            className="inline-flex items-center rounded-lg bg-flame px-5 py-2.5 text-sm font-medium text-ink transition-all duration-200 hover:bg-flame-soft hover:-translate-y-0.5"
          >
            Review My Clip
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {projects.map((p: (typeof projects)[number], i: number) => {
            const latest = p.versions[0];
            const tier = latest?.overallScore != null ? scoreTier(latest.overallScore) : null;
            return (
              <li key={p.id} className="rise-in" style={{ animationDelay: `${i * 50}ms` }}>
                <Link
                  href={`/review/${p.id}`}
                  className="group flex items-center justify-between px-6 py-5 transition-colors hover:bg-panel"
                >
                  <div>
                    <div className="text-paper font-medium transition-transform duration-200 group-hover:translate-x-0.5">
                      {p.title}
                    </div>
                    <div className="text-xs text-muted mt-1 font-mono">
                      {latest?.status === "processing"
                        ? "Processing…"
                        : latest?.status === "failed"
                        ? "Failed"
                        : `Version ${latest?.versionNumber ?? 1}`}
                    </div>
                  </div>
                  {tier && latest?.overallScore != null && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-mono text-lg text-paper tabular-nums">
                        {latest.overallScore}/100
                      </span>
                      <span className="transition-transform duration-200 group-hover:scale-125">
                        {tier.emoji}
                      </span>
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
