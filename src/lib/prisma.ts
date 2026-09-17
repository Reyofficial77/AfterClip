import { PrismaClient } from "@prisma/client";
import { getConnectionString } from "@netlify/database";

// Prevents exhausting DB connections from hot-reload in dev / repeated
// invocations of the same Netlify Function instance.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  // getConnectionString() resolves the right Postgres branch automatically
  // (production DB in production, an isolated branch per deploy preview)
  // when running on Netlify or under `netlify dev`. Falls back to a plain
  // DATABASE_URL env var for any other Postgres host.
  let datasourceUrl: string | undefined;
  try {
    datasourceUrl = getConnectionString();
  } catch {
    datasourceUrl = process.env.DATABASE_URL;
  }

  return new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
