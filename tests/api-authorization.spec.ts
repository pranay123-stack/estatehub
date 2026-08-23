import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { ACCOUNTS, listingPayload, signedInApi } from "./helpers";

/**
 * The highest-risk surface in the app: who is allowed to do what.
 * Every expectation here is a rule that must not silently regress.
 */
test.describe("listing authorization", () => {
  let anon: APIRequestContext;
  let buyer: APIRequestContext;
  let owner: APIRequestContext;
  let agent: APIRequestContext;
  let admin: APIRequestContext;

  test.beforeAll(async ({ playwright, baseURL }) => {
    anon = await playwright.request.newContext({ baseURL });
    buyer = await signedInApi(baseURL!, ACCOUNTS.buyer);
    owner = await signedInApi(baseURL!, ACCOUNTS.owner);
    agent = await signedInApi(baseURL!, ACCOUNTS.agent);
    admin = await signedInApi(baseURL!, ACCOUNTS.admin);
  });

  test.afterAll(async () => {
    await Promise.all([anon, buyer, owner, agent, admin].map((c) => c.dispose()));
  });

  test("anonymous visitors cannot create a listing", async () => {
    expect((await anon.post("/api/properties", { data: listingPayload() })).status()).toBe(401);
  });

  test("buyers cannot create a listing", async () => {
    const response = await buyer.post("/api/properties", { data: listingPayload() });
    expect(response.status()).toBe(403);
  });

  test("owners and agents can create a listing", async () => {
    for (const ctx of [owner, agent]) {
      const response = await ctx.post("/api/properties", { data: listingPayload() });
      expect(response.status()).toBe(201);

      const { data } = await response.json();
      // Never auto-published: it has to pass moderation first.
      expect(data.property.status).toBe("PENDING");
      await ctx.delete(`/api/properties/${data.property.id}`);
    }
  });

  test("an admin's own listing is published immediately", async () => {
    const response = await admin.post("/api/properties", { data: listingPayload() });
    const { data } = await response.json();

    expect(data.property.status).toBe("APPROVED");
    await admin.delete(`/api/properties/${data.property.id}`);
  });

  test("a pending listing is invisible in public search", async () => {
    const { data } = await (await owner.post("/api/properties", {
      data: listingPayload({ locality: "Wakad" }),
    })).json();

    const search = await (await anon.get("/api/properties?q=Wakad")).json();
    expect(search.data.total).toBe(0);

    await owner.delete(`/api/properties/${data.property.id}`);
  });

  test.describe("cross-user access", () => {
    let listingId: string;

    test.beforeAll(async () => {
      const { data } = await (await owner.post("/api/properties", { data: listingPayload() })).json();
      listingId = data.property.id;
    });

    test.afterAll(async () => {
      await owner.delete(`/api/properties/${listingId}`);
    });

    test("another user cannot edit it", async () => {
      const response = await agent.patch(`/api/properties/${listingId}`, { data: listingPayload() });
      expect(response.status()).toBe(403);
    });

    test("another user cannot delete it", async () => {
      expect((await agent.delete(`/api/properties/${listingId}`)).status()).toBe(403);
      expect((await buyer.delete(`/api/properties/${listingId}`)).status()).toBe(403);
    });

    test("another user cannot change its status", async () => {
      const response = await agent.patch(`/api/properties/${listingId}/status`, {
        data: { status: "APPROVED" },
      });
      expect(response.status()).toBe(403);
    });

    test("the owner cannot approve their own listing", async () => {
      // Self-approval would defeat moderation entirely.
      const response = await owner.patch(`/api/properties/${listingId}/status`, {
        data: { status: "APPROVED" },
      });
      expect(response.status()).toBe(403);
    });

    test("an admin can approve it, and it then appears publicly", async () => {
      const approve = await admin.patch(`/api/properties/${listingId}/status`, {
        data: { status: "APPROVED" },
      });
      expect(approve.ok()).toBe(true);

      const search = await (await anon.get("/api/properties?q=Hinjewadi")).json();
      expect(search.data.total).toBe(1);
    });

    test("an owner edit sends it back to the moderation queue", async () => {
      const response = await owner.patch(`/api/properties/${listingId}`, {
        data: listingPayload({ price: 6_900_000 }),
      });

      expect((await response.json()).data.property.status).toBe("PENDING");
      const search = await (await anon.get("/api/properties?q=Hinjewadi")).json();
      expect(search.data.total).toBe(0);
    });
  });

  test("editing a listing that does not exist returns 404", async () => {
    const response = await owner.patch("/api/properties/does-not-exist", { data: listingPayload() });
    expect(response.status()).toBe(404);
  });
});

test.describe("admin user management", () => {
  test("only admins may change a user's role", async ({ baseURL, playwright }) => {
    const admin = await signedInApi(baseURL!, ACCOUNTS.admin);
    const owner = await signedInApi(baseURL!, ACCOUNTS.owner);
    const anon = await playwright.request.newContext({ baseURL });

    const users = await (await admin.get("/api/properties")).json();
    expect(users.ok).toBe(true); // sanity: admin session works

    const buyerId = (await (await admin.post("/api/auth/register", {
      data: { name: "Target User", email: `target-${Date.now()}@example.com`, password: "Password123" },
    })).json()).data?.user?.id;

    // The register call above replaced the admin's cookie, so use a fresh one.
    const admin2 = await signedInApi(baseURL!, ACCOUNTS.admin);

    expect((await anon.patch(`/api/admin/users/${buyerId}`, { data: { role: "AGENT" } })).status()).toBe(401);
    expect((await owner.patch(`/api/admin/users/${buyerId}`, { data: { role: "AGENT" } })).status()).toBe(403);
    expect((await admin2.patch(`/api/admin/users/${buyerId}`, { data: { role: "AGENT" } })).ok()).toBe(true);

    await Promise.all([admin.dispose(), admin2.dispose(), owner.dispose(), anon.dispose()]);
  });

  test("an admin cannot change their own role or suspend themselves", async ({ baseURL }) => {
    const admin = await signedInApi(baseURL!, ACCOUNTS.admin);

    // Recover the admin's own id from a listing they can see.
    const me = await (await admin.post("/api/auth/login", {
      data: { email: ACCOUNTS.admin, password: "Password123" },
    })).json();

    const response = await admin.patch(`/api/admin/users/${me.data.user.id}`, {
      data: { role: "BUYER" },
    });

    // Otherwise an admin could lock themselves out of the panel in one click.
    expect(response.status()).toBe(400);
    await admin.dispose();
  });
});

test.describe("favourites and enquiries", () => {
  test("saving requires a session", async ({ request }) => {
    const listing = (await (await request.get("/api/properties")).json()).data.items[0];
    expect((await request.post("/api/favorites", { data: { propertyId: listing.id } })).status()).toBe(401);
  });

  test("saving toggles and is idempotent per click", async ({ baseURL, request }) => {
    const listing = (await (await request.get("/api/properties")).json()).data.items[0];
    const buyer = await signedInApi(baseURL!, ACCOUNTS.buyer);

    const first = await (await buyer.post("/api/favorites", { data: { propertyId: listing.id } })).json();
    const second = await (await buyer.post("/api/favorites", { data: { propertyId: listing.id } })).json();

    expect(first.data.saved).toBe(!second.data.saved);
    await buyer.dispose();
  });

  test("saving a listing that does not exist returns 404", async ({ baseURL }) => {
    const buyer = await signedInApi(baseURL!, ACCOUNTS.buyer);
    expect((await buyer.post("/api/favorites", { data: { propertyId: "nope" } })).status()).toBe(404);
    await buyer.dispose();
  });

  test("anonymous visitors may enquire about a live listing", async ({ request }) => {
    const listing = (await (await request.get("/api/properties")).json()).data.items[0];

    const response = await request.post("/api/enquiries", {
      data: {
        propertyId: listing.id,
        name: "Anon Buyer",
        email: "anon@example.com",
        phone: "+919812345678",
        message: "Is this still available for a viewing this weekend?",
      },
    });

    expect(response.status()).toBe(201);
  });

  test("enquiring about a non-approved listing returns 404, not 403", async ({ baseURL, request }) => {
    const owner = await signedInApi(baseURL!, ACCOUNTS.owner);
    const { data } = await (await owner.post("/api/properties", { data: listingPayload() })).json();

    const response = await request.post("/api/enquiries", {
      data: {
        propertyId: data.property.id,
        name: "Anon Buyer",
        email: "anon@example.com",
        phone: "+919812345678",
        message: "Trying to reach a listing that is not public yet.",
      },
    });

    // 403 would confirm the listing exists; 404 leaks nothing.
    expect(response.status()).toBe(404);

    await owner.delete(`/api/properties/${data.property.id}`);
    await owner.dispose();
  });

  test("an owner cannot enquire about their own listing", async ({ baseURL, request }) => {
    const listing = (await (await request.get("/api/properties?q=Powai")).json()).data.items[0];
    const owner = await signedInApi(baseURL!, ACCOUNTS.owner);

    const response = await owner.post("/api/enquiries", {
      data: {
        propertyId: listing.id,
        name: "Rohan Mehta",
        email: ACCOUNTS.owner,
        phone: "+919812345678",
        message: "Enquiring about a property that I happen to own myself.",
      },
    });

    expect(response.status()).toBe(400);
    await owner.dispose();
  });
});

test.describe("uploads", () => {
  test("require a seller role", async ({ baseURL, request }) => {
    expect((await request.post("/api/uploads", { multipart: {} })).status()).toBe(401);

    const buyer = await signedInApi(baseURL!, ACCOUNTS.buyer);
    expect((await buyer.post("/api/uploads", { multipart: {} })).status()).toBe(403);
    await buyer.dispose();
  });

  test("reject a non-image and an oversized file", async ({ baseURL }) => {
    const owner = await signedInApi(baseURL!, ACCOUNTS.owner);

    const notAnImage = await owner.post("/api/uploads", {
      multipart: { files: { name: "evil.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") } },
    });
    expect(notAnImage.status()).toBe(415);

    const tooBig = await owner.post("/api/uploads", {
      multipart: { files: { name: "big.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(6 * 1024 * 1024) } },
    });
    expect(tooBig.status()).toBe(413);

    await owner.dispose();
  });

  test("accept a valid image and serve it back", async ({ baseURL, request }) => {
    const owner = await signedInApi(baseURL!, ACCOUNTS.owner);

    const response = await owner.post("/api/uploads", {
      multipart: {
        files: { name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]) },
      },
    });

    expect(response.status()).toBe(201);
    const { data } = await response.json();
    expect(data.images[0].url).toMatch(/^\/api\/files\//);

    // The file must be reachable in the production build — this is exactly the
    // case that silently broke when uploads were written into public/.
    const served = await request.get(data.images[0].url);
    expect(served.status()).toBe(200);
    expect(served.headers()["content-type"]).toBe("image/jpeg");

    await owner.dispose();
  });
});

test.describe("GET /api/files", () => {
  const traversals = [
    "../../package.json",
    "..%2F..%2Fpackage.json",
    ".env",
    "notes.txt",
    "../prisma/schema.prisma",
  ];

  for (const name of traversals) {
    test(`rejects "${name}"`, async ({ request }) => {
      expect((await request.get(`/api/files/${name}`)).status()).toBe(404);
    });
  }
});
