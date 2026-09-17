// Runs as part of `npm run build` on Netlify. Pushes prisma/schema.prisma
// to whichever Postgres branch Netlify DB provisioned for this deploy
// (production DB on production deploys, an isolated branch per preview).
//
// Safe to run outside Netlify too: if @netlify/database can't resolve a
// connection string (e.g. a plain `next build` with DATABASE_URL already
// set in the environment), it just falls through and lets `prisma db push`
// use DATABASE_URL as-is. If neither is set, this script no-ops so a
// generic `next build` isn't blocked.
import { execSync } from "node:child_process";

let datasourceUrl = process.env.DATABASE_URL;

try {
  const { getConnectionString } = await import("@netlify/database");
  datasourceUrl = getConnectionString();
} catch {
  // @netlify/database not resolvable outside a Netlify build/dev context —
  // fall back to whatever DATABASE_URL is already in the environment.
}

if (!datasourceUrl) {
  console.log(
    "[netlify-db-push] No database connection string available — skipping `prisma db push`."
  );
  process.exit(0);
}

console.log("[netlify-db-push] Pushing prisma/schema.prisma to the database…");
execSync("npx prisma db push --skip-generate --accept-data-loss", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: datasourceUrl },
});
