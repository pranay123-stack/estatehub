import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("Password123");
    expect(await verifyPassword("Password123", hash)).toBe(true);
    expect(await verifyPassword("password123", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("never stores the plaintext", async () => {
    const hash = await hashPassword("Password123");
    expect(hash).not.toContain("Password123");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("salts, so identical passwords produce different hashes", async () => {
    const [a, b] = await Promise.all([hashPassword("Password123"), hashPassword("Password123")]);
    expect(a).not.toBe(b);
    expect(await verifyPassword("Password123", b)).toBe(true);
  });
});
