# AfterClip

> "You made the clip. Now find out if it's actually good."

Companion product to [ClipForge](https://clipforgeid.netlify.app). ClipForge helps
creators make clips; AfterClip tells them, honestly, whether the finished clip
is actually good — and exactly what to fix.

The full app — database, UI, and API — is real and working end-to-end.
AI analysis is also real (Gemini) for YouTube/YouTube Shorts clips; see
"AI: what's real, what's mocked" below for exactly what that covers and
where it still falls back to a mock.

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
   variables to turn on real analysis (see "AI: what's real, what's mocked"
   below) — without it, AfterClip runs on the deterministic mock instead.

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

## AI: what's real, what's mocked

**Real Gemini analysis** (`src/lib/gemini.ts`, `analyzeClipWithGemini` /
`chatWithGemini`) runs whenever `GEMINI_API_KEY` is set:
- Uses Gemini's native YouTube-URL support (`fileData: { fileUri: <youtube url> }`)
  — no video download/upload step needed for **YouTube / YouTube Shorts**.
  Reference-clip comparison also attaches the reference video the same way
  when it's a YouTube URL.
- The model is instructed (system prompt) to return **strict JSON only**,
  matching `AIReviewResult` exactly; every response is validated with a zod
  schema (`aiReviewResultSchema`) before it ever reaches the database or UI —
  a malformed response is treated as a failure, never patched or guessed at.
- Chat (`chatWithGemini`) is a text-only call grounded in that version's
  *stored* review JSON plus the real conversation history — it answers from
  the data, not a fresh re-analysis.

**TikTok is honestly unsupported for real analysis right now.** Gemini's
direct-URL video support only covers YouTube — there's no equivalent for
TikTok without a video-retrieval pipeline (download the clip, then upload it
via the Files API), which isn't built here. Submitting a TikTok URL with
`GEMINI_API_KEY` set returns a `failed` version with an honest
"can't access this video" message (`CantAccessVideoError`) — it does **not**
silently fall back to a fake review, per the PRD's "never pretend to have
watched a video" rule. To add TikTok support, build a retrieval step that
downloads the clip and uploads it via the Gemini Files API instead of
`fileData: { fileUri }`.

**No `GEMINI_API_KEY` set → deterministic mock**, so local dev/testing works
without a key. Every mock score, note, and chat reply is prefixed
`[MOCK — no GEMINI_API_KEY set]` so it's never mistaken for a real review.

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
  gemini.ts                 Real Gemini analysis + chat, mock fallback (see above)
  url.ts                    YouTube/TikTok URL validation
  prisma.ts                 Prisma client singleton
  serialize.ts              DB record → UI-shaped review object
  validators.ts             zod schemas for API input
src/components/             ScoreRing, CategoryBars, TimestampList, VerdictBanner,
                             ChatPanel, ReviseForm, VersionProgress
src/types/review.ts         Shared types + score/verdict tier helpers
```

## Not yet built (P1/P2 from the PRD)

- TikTok video retrieval (download + Gemini Files API upload) so TikTok clips
  get real analysis instead of an honest "can't access" failure
- Review history filtering/search beyond the dashboard list
- Performance analytics after publishing
- Direct ClipForge → AfterClip handoff
