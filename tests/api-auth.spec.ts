import { expect, test } from "@playwright/test";
import { request } from "@playwright/test";
import { ACCOUNTS, PASSWORD } from "./helpers";

test.describe("registration", () => {
  test("creates an account and starts a session", async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });
    const email = `signup-${Date.now()}@example.com`;

    const response = await ctx.post("/api/auth/register", {
      data: { name: "New Owner", email, password: PASSWORD, role: "OWNER" },
    });

    expect(response.status()).toBe(201);
    const { data } = await response.json();
    expect(data.user).toMatchObject({ email, role: "OWNER" });

    // The session cookie is set, so a protected call works immediately.
    expect((await ctx.post("/api/properties", { data: {} })).status()).not.toBe(401);
    await ctx.dispose();
  });

  test("refuses a duplicate email", async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });
    const response = await ctx.post("/api/auth/register", {
      data: { name: "Impostor", email: ACCOUNTS.owner, password: PASSWORD, role: "OWNER" },
    });

    expect(response.status()).toBe(409);
    await ctx.dispose();
  });

  test("cannot self-assign the ADMIN role", async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });
    const response = await ctx.post("/api/auth/register", {
      data: { name: "Sneaky User", email: `sneaky-${Date.now()}@example.com`, password: PASSWORD, role: "ADMIN" },
    });

    expect(response.status()).toBe(422);
    expect((await response.json()).fields.role).toBeTruthy();
    await ctx.dispose();
  });

  test("reports every invalid field at once", async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });
    const response = await ctx.post("/api/auth/register", {
      data: { name: "X", email: "nope", password: "123" },
    });

    expect(response.status()).toBe(422);
    const { fields } = await response.json();
    expect(Object.keys(fields).sort()).toEqual(["email", "name", "password"]);
    await ctx.dispose();
  });
});

test.describe("login", () => {
  test("accepts correct credentials", async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });
    const response = await ctx.post("/api/auth/login", {
      data: { email: ACCOUNTS.buyer, password: PASSWORD },
    });

    expect(response.ok()).toBe(true);
    expect((await response.json()).data.user.role).toBe("BUYER");
    await ctx.dispose();
  });

  test("gives an identical error for a wrong password and an unknown email", async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });

    const wrongPassword = await ctx.post("/api/auth/login", {
      data: { email: ACCOUNTS.buyer, password: "not-the-password" },
    });
    const unknownEmail = await ctx.post("/api/auth/login", {
      data: { email: "nobody@example.com", password: "not-the-password" },
    });

    expect(wrongPassword.status()).toBe(401);
    expect(unknownEmail.status()).toBe(401);
    // Distinguishable errors would let an attacker enumerate registered users.
    expect(await wrongPassword.json()).toEqual(await unknownEmail.json());
    await ctx.dispose();
  });

  test("is case-insensitive on the email", async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });
    const response = await ctx.post("/api/auth/login", {
      data: { email: ACCOUNTS.buyer.toUpperCase(), password: PASSWORD },
    });

    expect(response.ok()).toBe(true);
    await ctx.dispose();
  });
});

test("logout clears the session", async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  await ctx.post("/api/auth/login", { data: { email: ACCOUNTS.owner, password: PASSWORD } });

  expect((await ctx.post("/api/properties", { data: {} })).status()).toBe(422); // authenticated, bad body
  await ctx.post("/api/auth/logout");
  expect((await ctx.post("/api/properties", { data: {} })).status()).toBe(401); // no longer authenticated

  await ctx.dispose();
});
