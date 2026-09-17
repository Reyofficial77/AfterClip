# AfterClip

> "You made the clip. Now find out if it's actually good."

Companion product to [ClipForge](https://clipforgeid.netlify.app). ClipForge helps
creators make clips; AfterClip tells them, honestly, whether the finished clip
is actually good — and exactly what to fix.

This is an MVP scaffold: the full app structure, database, UI, and API are
real and working end-to-end, but the AI video analysis is **stubbed** (see
below) instead of calling a real multimodal model yet.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS**
- **Prisma + Postgres**, provisioned automatically via **Netlify DB**
  (`@netlify/database`) — production deploys use the main database branch,
  each deploy preview gets its own isolated branch
- No auth in this MVP — single-user, open access

## Deploying to Netlify

This repo is ready to deploy as-is:

1. Push it to a git repo and connect it as a new Netlify site (or run
   `netlify deploy` from this directory).
2. Netlify auto-detects the Next.js framework and installs dependencies,
   which provisions a Postgres database via Netlify DB automatically —
   no manual database setup or connection string needed.
3. `npm run build` (Netlify's build command) runs
   `scripts/netlify-db-push.mjs` first, which pushes `prisma/schema.prisma`
   to that deploy's database branch, then runs `next build`.
4. Set `GEMINI_API_KEY` / `GEMINI_MODEL` in the Netlify site's environment
   variables once you wire up the real AI pipeline (see below) — not
   required for the current stubbed version.

## Local development

**Option A — `netlify dev` (recommended, matches production):**

```bash
npm install
netlify link   # link this directory to your Netlify site
netlify dev    # provisions/connects a local DB branch automatically
```

**Option B — plain `next dev` against your own Postgres:**

```bash
npm install
cp .env.example .env   # set DATABASE_URL to a real Postgres instance
npm run db:push
npm run dev
```

Open http://localhost:3000 either way.

## What's real vs. stubbed

**Real and working:**
- Landing page, dashboard, submit form, review results, revision flow, AI
  chat panel, version progress — all wired to a real Postgres database via
  Prisma and real API routes.
- URL validation for YouTube / YouTube Shorts / TikTok (`src/lib/url.ts`).
- The full structured review schema from the PRD (`src/types/review.ts`),
  persisted and re-hydrated correctly.

**Stubbed — needs the real AI pipeline:**
- `src/lib/gemini.ts` — `runMockAnalysis()` returns deterministic mock scores
  and feedback shaped exactly like the real thing would, so every screen has
  real data to render. `mockChatReply()` answers chat questions from the
  *stored* review data (not random), matching the PRD's "don't regenerate
  random opinions" rule — but it's template-based, not a real model call.

### Wiring up the real Gemini analysis

1. `npm install @google/genai`
2. Set `GEMINI_API_KEY` and `GEMINI_MODEL` in `.env`.
3. In `src/lib/gemini.ts`, replace the body of `runMockAnalysis` with a
   multimodal request (video/audio in, strict JSON out) and validate the
   response with a zod schema before trusting it — **never let a malformed
   AI response reach the UI**. Keep the return type `AIReviewResult` so
   nothing downstream (API routes, pages, components) needs to change.
4. You'll also need an actual video retrieval step (download / extract
   frames+audio from the YouTube/TikTok URL) before you can send anything to
   the model — that's not implemented here. Respect the PRD's "never pretend
   to have watched a video" rule: if retrieval fails, surface that honestly
   instead of falling back to the mock.

## Project structure

```
prisma/schema.prisma        ClipProject → ReviewVersion → (CategoryScore, TimestampFeedback, AIMessage)
src/app/
  page.tsx                  Landing page
  dashboard/page.tsx        Recent reviews list
  submit/page.tsx           Submit clip form
  review/[id]/page.tsx      Review results (score, breakdown, chat, revise)
  api/reviews/              POST create review, GET list
  api/reviews/[id]/         GET one project + all its versions
  api/reviews/[id]/revise/  POST a revised version
  api/reviews/[id]/chat/    GET/POST chat scoped to one review version
src/lib/
  gemini.ts                 Stubbed AI pipeline (see above)
  url.ts                    YouTube/TikTok URL validation
  prisma.ts                 Prisma client singleton
  serialize.ts              DB record → UI-shaped review object
  validators.ts             zod schemas for API input
src/components/             ScoreRing, CategoryBars, TimestampList, VerdictBanner,
                             ChatPanel, ReviseForm, VersionProgress
src/types/review.ts         Shared types + score/verdict tier helpers
```

## Not yet built (P1/P2 from the PRD)

- Real video retrieval + multimodal analysis
- Review history filtering/search beyond the dashboard list
- Performance analytics after publishing
- Direct ClipForge → AfterClip handoff
