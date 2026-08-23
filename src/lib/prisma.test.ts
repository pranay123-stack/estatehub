import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Guards the deploy-time contract: `next build` imports every route module to
 * collect its configuration, so importing the Prisma client must never require
 * DATABASE_URL. Building it at module scope once broke a Vercel deploy with a
 * stack trace instead of a usable message.
 */
describe("prisma client", () => {
  const original = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as { prisma?: unknown }).prisma;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
    delete (globalThis as { prisma?: unknown }).prisma;
  });

  it("imports cleanly with no DATABASE_URL", async () => {
    delete process.env.DATABASE_URL;
    await expect(import("./prisma")).resolves.toHaveProperty("prisma");
  });

  it("explains itself on first use when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;
    const { prisma } = await import("./prisma");

    // The failure belongs at request time, with an actionable message.
    expect(() => prisma.property).toThrow(/DATABASE_URL is not set/);
  });

  it("constructs a usable client when DATABASE_URL is present", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db?schema=public";
    const { prisma } = await import("./prisma");

    expect(prisma.property).toBeDefined();
    expect(typeof prisma.$transaction).toBe("function");
  });

  it("returns the same instance across accesses", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db?schema=public";
    const { prisma } = await import("./prisma");

    // A new client per access would exhaust the connection pool.
    expect(prisma.property).toBe(prisma.property);
  });
});
