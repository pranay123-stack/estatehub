import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { createSessionToken, verifySessionToken } from "./session";

const SECRET = "test-secret-that-is-at-least-32-characters-long";

const payload = {
  sub: "user_123",
  email: "owner@estatehub.in",
  name: "Rohan Mehta",
  role: "OWNER" as const,
};

beforeEach(() => {
  process.env.AUTH_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.AUTH_SESSION_DAYS;
});

describe("session tokens", () => {
  it("round-trips a payload", async () => {
    const verified = await verifySessionToken(await createSessionToken(payload));
    expect(verified).toEqual(payload);
  });

  it("rejects a token signed with a different secret", async () => {
    // Rotating AUTH_SECRET must invalidate every issued session.
    const token = await createSessionToken(payload);
    process.env.AUTH_SECRET = "a-completely-different-secret-of-sufficient-length";
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects a tampered payload", async () => {
    const token = await createSessionToken(payload);
    const [header, body, signature] = token.split(".");

    // Re-encode the claims with an escalated role, keeping the old signature.
    const claims = JSON.parse(Buffer.from(body, "base64url").toString());
    claims.role = "ADMIN";
    const forgedBody = Buffer.from(JSON.stringify(claims)).toString("base64url");

    expect(await verifySessionToken(`${header}.${forgedBody}.${signature}`)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const expired = await new SignJWT({ email: payload.email, name: payload.name, role: payload.role })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(new TextEncoder().encode(SECRET));

    expect(await verifySessionToken(expired)).toBeNull();
  });

  it("rejects an unsigned `alg: none` token", async () => {
    // Classic JWT downgrade attack; verification pins HS256.
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ sub: "user_123", role: "ADMIN" })).toString("base64url");
    expect(await verifySessionToken(`${header}.${body}.`)).toBeNull();
  });

  it("rejects malformed input instead of throwing", async () => {
    for (const bad of ["", "not-a-token", "a.b.c", "..", "null"]) {
      expect(await verifySessionToken(bad)).toBeNull();
    }
  });

  it("refuses to sign when AUTH_SECRET is missing or too short", async () => {
    delete process.env.AUTH_SECRET;
    await expect(createSessionToken(payload)).rejects.toThrow(/AUTH_SECRET/);

    process.env.AUTH_SECRET = "too-short";
    await expect(createSessionToken(payload)).rejects.toThrow(/at least 32/);
  });

  it("falls back to a 7-day lifetime when AUTH_SESSION_DAYS is nonsense", async () => {
    process.env.AUTH_SESSION_DAYS = "not-a-number";
    const token = await createSessionToken(payload);
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());

    const days = Math.round((claims.exp - claims.iat) / 86_400);
    expect(days).toBe(7);
  });
});
