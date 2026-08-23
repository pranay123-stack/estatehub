import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * How many connections this process may hold.
 *
 * Note that `?connection_limit=` and `?pgbouncer=` in the connection string are
 * Prisma *query-engine* parameters. This app uses the node-postgres driver
 * adapter instead, which ignores them — pool sizing has to come from here.
 *
 * On a serverless host every concurrent invocation is its own process, so each
 * one keeping a pool open multiplies fast and exhausts the database's client
 * limit. One connection each is the standard pairing with a transaction pooler.
 * A long-running server is the opposite case: it handles all traffic in one
 * process, so a single connection would serialise every query.
 */
function poolSize(): number {
  const configured = Number(process.env.DATABASE_POOL_MAX);
  if (Number.isInteger(configured) && configured > 0) return configured;

  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  return serverless ? 1 : 10;
}

/**
 * Prisma 7 talks to Postgres through a driver adapter (no Rust engine binary),
 * which keeps the serverless bundle small on Vercel.
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env for local development, " +
        "or set it in your host's environment variables.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: poolSize() }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * Cached on `globalThis` because Next.js re-evaluates modules on every HMR
 * cycle in dev — without this you exhaust the connection pool within a few
 * saves. In production the module is evaluated once, so it is a no-op.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function client(): PrismaClient {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}

/**
 * Constructed on first use, not on import.
 *
 * `next build` imports every route module to collect its configuration. If the
 * client were built at module scope, that import would throw whenever
 * DATABASE_URL is absent — which is exactly the case on a first deploy, before
 * the environment variables are wired up. The build would fail with a stack
 * trace pointing here rather than a useful message, and it would fail even
 * though nothing at build time actually queries the database.
 *
 * The proxy defers construction to the first property access, so importing this
 * module is always safe and a missing DATABASE_URL surfaces at request time
 * with the message above.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const instance = client() as unknown as Record<string | symbol, unknown>;
    const value = instance[property];
    // Bind methods so `this` is the real client, not the proxy.
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
