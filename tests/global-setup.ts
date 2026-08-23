import { execSync } from "node:child_process";
import { config as loadEnv } from "dotenv";

/**
 * Prepares the throwaway test database once per run: applies migrations, wipes
 * every table, then seeds the 20 demo listings.
 *
 * Tests assert against seeded data, so a clean, known starting state matters
 * more than speed here.
 */
export default async function globalSetup() {
  loadEnv({ path: ".env.test" });

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — check .env.test");

  // The suite truncates every table, so refuse to run against anything that is
  // not obviously a throwaway database. This is the guard that matters: it holds
  // regardless of where DATABASE_URL came from.
  const database = new URL(url).pathname.replace(/^\//, "");
  if (!/test/i.test(database)) {
    throw new Error(
      `Refusing to reset database "${database}" — the E2E database name must contain "test".`,
    );
  }

  const env = { ...process.env, DATABASE_URL: url };

  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });

  // Truncate rather than drop, so migrations only re-run when they change.
  // Prisma 7's `db execute` takes its URL from prisma.config.ts, which reads
  // DATABASE_URL from the environment we pass here.
  execSync("npx prisma db execute --stdin", {
    env,
    input: 'TRUNCATE "Property", "User" CASCADE;',
    stdio: ["pipe", "pipe", "pipe"],
  });

  execSync("npx tsx prisma/seed.ts", { env, stdio: "pipe" });
}
