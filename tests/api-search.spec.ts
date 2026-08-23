import { expect, test } from "@playwright/test";
import type { SearchItem, SearchResponse } from "./helpers";

/** The public search endpoint — no authentication, seeded data. */
test.describe("GET /api/properties", () => {
  test("returns approved listings with pagination metadata", async ({ request }) => {
    const { data }: SearchResponse = await (await request.get("/api/properties")).json() as SearchResponse;

    expect(data.total).toBe(20);
    expect(data.items).toHaveLength(9); // PAGE_SIZE
    expect(data.page).toBe(1);
    expect(data.pageCount).toBe(3);
    expect(data.items.every((p: SearchItem) => p.status === "APPROVED")).toBe(true);
  });

  test("filters by city, case-insensitively", async ({ request }) => {
    const { data }: SearchResponse = await (await request.get("/api/properties?city=mumbai")).json() as SearchResponse;

    expect(data.total).toBeGreaterThan(0);
    expect(data.items.every((p: SearchItem) => p.city === "Mumbai")).toBe(true);
  });

  test("filters by listing type and property type together", async ({ request }) => {
    const { data }: SearchResponse = await (await request.get("/api/properties?listingType=RENT&type=APARTMENT")).json() as SearchResponse;

    expect(data.total).toBeGreaterThan(0);
    expect(data.items.every((p: SearchItem) => p.listingType === "RENT" && p.type === "APARTMENT")).toBe(true);
  });

  test("treats the bedroom filter as a minimum, not an exact match", async ({ request }) => {
    const { data }: SearchResponse = await (await request.get("/api/properties?bedrooms=4")).json() as SearchResponse;

    expect(data.total).toBeGreaterThan(0);
    expect(data.items.every((p: SearchItem) => p.bedrooms >= 4)).toBe(true);
  });

  test("respects a price range", async ({ request }) => {
    const { data } = await (
      await request.get("/api/properties?listingType=SALE&minPrice=10000000&maxPrice=50000000")
    ).json() as SearchResponse;

    expect(data.total).toBeGreaterThan(0);
    expect(data.items.every((p: SearchItem) => p.price >= 10_000_000 && p.price <= 50_000_000)).toBe(true);
  });

  test("searches free text across title, locality and city", async ({ request }) => {
    const { data }: SearchResponse = await (await request.get("/api/properties?q=powai")).json() as SearchResponse;

    expect(data.total).toBe(1);
    expect(data.items[0].title).toContain("Powai");
  });

  test("sorts ascending and descending by price", async ({ request }) => {
    const asc: SearchResponse = await (await request.get("/api/properties?sort=price_asc")).json();
    const desc: SearchResponse = await (await request.get("/api/properties?sort=price_desc")).json();

    const ascPrices = asc.data.items.map((p) => p.price);
    const descPrices = desc.data.items.map((p) => p.price);

    expect(ascPrices).toEqual([...ascPrices].sort((a, b) => a - b));
    expect(descPrices).toEqual([...descPrices].sort((a, b) => b - a));
    expect(ascPrices[0]).toBeLessThan(descPrices[0]);
  });

  test("paginates without repeating results", async ({ request }) => {
    const p1: SearchResponse = await (await request.get("/api/properties?page=1")).json();
    const p2: SearchResponse = await (await request.get("/api/properties?page=2")).json();

    const ids = new Set([...p1.data.items, ...p2.data.items].map((p) => p.id));
    expect(ids.size).toBe(p1.data.items.length + p2.data.items.length);
  });

  test("returns an empty page rather than an error past the last page", async ({ request }) => {
    const response = await request.get("/api/properties?page=999");

    expect(response.ok()).toBe(true);
    expect((await response.json()).data.items).toEqual([]);
  });

  test("degrades gracefully on junk query parameters", async ({ request }) => {
    // A hand-edited URL must never produce a 500.
    const response = await request.get(
      "/api/properties?type=NONSENSE&listingType=%20&sort=sideways&page=abc&minPrice=-99&bedrooms=999",
    );

    expect(response.status()).toBe(200);
    expect((await response.json()).data.total).toBe(20);
  });

  test("combines filters correctly", async ({ request }) => {
    const { data } = await (
      await request.get("/api/properties?city=Pune&listingType=RENT&maxPrice=40000")
    ).json();

    expect(data.items.every((p: SearchItem) => p.city === "Pune" && p.listingType === "RENT" && p.price <= 40_000)).toBe(true);
  });
});
