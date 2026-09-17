type VersionSummary = {
  id: string;
  versionNumber: number;
  overallScore: number | null;
  status: string;
};

export function VersionProgress({
  versions,
  activeId,
  projectId,
}: {
  versions: VersionSummary[];
  activeId: string;
  projectId: string;
}) {
  if (versions.length < 2) return null;

  return (
    <div className="rounded-xl border border-border bg-panel p-5 rise-in">
      <h3 className="font-display font-medium text-paper mb-4">Progress</h3>
      <div className="space-y-2">
        {versions.map((v, i) => {
          const prev = versions[i - 1];
          const delta =
            prev && v.overallScore != null && prev.overallScore != null
              ? v.overallScore - prev.overallScore
              : null;
          const isActive = v.id === activeId;
          return (
            <a
              key={v.id}
              href={`/review/${projectId}?v=${v.versionNumber}`}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all duration-150 hover:translate-x-0.5 ${
                isActive ? "bg-surface" : "hover:bg-surface/60"
              }`}
            >
              <span className={isActive ? "text-paper font-medium" : "text-muted"}>
                Version {v.versionNumber}
              </span>
              <span className="flex items-center gap-2 font-mono tabular-nums">
                <span className={isActive ? "text-paper" : "text-muted"}>
                  {v.overallScore ?? "…"}
                </span>
                {delta != null && (
                  <span className={delta >= 0 ? "text-lime text-xs" : "text-rose text-xs"}>
                    {delta >= 0 ? "+" : ""}
                    {delta}
                  </span>
                )}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
