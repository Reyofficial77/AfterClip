import Link from "next/link";
import { ScoreRing } from "@/components/ScoreRing";

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 bg-flame-glow pointer-events-none" />

      <nav className="relative max-w-6xl mx-auto flex items-center justify-between px-6 py-7 rise-in">
        <span className="font-display font-semibold text-lg tracking-tight text-paper">
          AfterClip
        </span>
        <a
          href="https://clipforgeid.netlify.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted hover:text-paper transition-colors"
        >
          Made a clip with ClipForge? →
        </a>
      </nav>

      <section className="relative max-w-6xl mx-auto px-6 pt-16 pb-28 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <h1
            className="font-display font-semibold text-4xl sm:text-5xl leading-[1.08] text-paper rise-in"
            style={{ animationDelay: "80ms" }}
          >
            Your clip is done.
            <br />
            But is it{" "}
            <span className="text-flame">actually</span> good?
          </h1>
          <p
            className="mt-6 text-lg text-muted leading-relaxed max-w-md rise-in"
            style={{ animationDelay: "180ms" }}
          >
            Let AfterClip watch your clip, rate it honestly, find what&apos;s hurting
            retention, and tell you exactly what to fix.
          </p>
          <div
            className="mt-9 flex flex-wrap items-center gap-4 rise-in"
            style={{ animationDelay: "280ms" }}
          >
            <Link
              href="/submit"
              className="inline-flex items-center justify-center rounded-lg bg-flame px-6 py-3.5 font-medium text-ink transition-all duration-200 hover:bg-flame-soft hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(255,90,54,0.55)] active:translate-y-0"
            >
              Review My Clip
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3.5 font-medium text-paper/90 transition-all duration-200 hover:border-muted hover:-translate-y-0.5 active:translate-y-0"
            >
              See Example Review
            </Link>
          </div>
          <p
            className="mt-6 text-xs text-muted font-mono rise-in"
            style={{ animationDelay: "360ms" }}
          >
            ClipForge creates. AfterClip critiques.
          </p>
        </div>

        <div className="flex justify-center lg:justify-end rise-in" style={{ animationDelay: "220ms" }}>
          <div className="rounded-2xl border border-border bg-panel p-8 w-full max-w-sm transition-transform duration-300 hover:-translate-y-1">
            <div className="text-xs font-mono text-muted mb-6 tracking-wide">
              AFTERCLIP SCORE
            </div>
            <div className="flex justify-center">
              <ScoreRing score={91} size={168} />
            </div>
            <div className="mt-6 pt-6 border-t border-border space-y-3">
              <Row label="Hook" value={92} />
              <Row label="Retention" value={88} />
              <Row label="Entertainment" value={91} />
            </div>
          </div>
        </div>
      </section>

      <section className="relative max-w-6xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-3 gap-6">
          <Feature
            index={0}
            title="Brutally honest"
            body="No fake positivity. If the hook is weak, AfterClip says so — and tells you exactly why."
          />
          <Feature
            index={1}
            title="Timestamp-specific"
            body="Not just 'improve pacing.' You get the exact second that's losing viewers."
          />
          <Feature
            index={2}
            title="Tracks your progress"
            body="Submit a revised cut and see whether you actually improved, category by category."
          />
        </div>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-mono text-paper/80">{value}</span>
    </div>
  );
}

function Feature({ title, body, index }: { title: string; body: string; index: number }) {
  return (
    <div
      className="border-l-2 border-flame/40 pl-5 py-1 rise-in transition-colors duration-200 hover:border-flame"
      style={{ animationDelay: `${420 + index * 90}ms` }}
    >
      <h3 className="font-display font-medium text-paper mb-1.5">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{body}</p>
    </div>
  );
}
