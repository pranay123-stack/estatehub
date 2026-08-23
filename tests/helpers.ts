import type { APIRequestContext, Browser, Page } from "@playwright/test";
import { request } from "@playwright/test";

export const PASSWORD = "Password123";

export const ACCOUNTS = {
  admin: "admin@estatehub.in",
  owner: "owner@estatehub.in",
  agent: "agent@estatehub.in",
  buyer: "buyer@estatehub.in",
} as const;

/** A fresh API context already carrying a session cookie for `email`. */
export async function signedInApi(baseURL: string, email: string): Promise<APIRequestContext> {
  const ctx = await request.newContext({ baseURL });
  const response = await ctx.post("/api/auth/login", { data: { email, password: PASSWORD } });
  if (!response.ok()) {
    throw new Error(`Could not sign in as ${email}: ${response.status()} ${await response.text()}`);
  }
  return ctx;
}

/** Signs in through the real login form and waits for the dashboard. */
export async function signInViaForm(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((url) => url.pathname.startsWith("/dashboard"));
}

/** A browser page with a session already established. */
export async function signedInPage(browser: Browser, email: string): Promise<Page> {
  const page = await browser.newPage();
  await signInViaForm(page, email);
  return page;
}

/** Payload that satisfies propertyInputSchema; override fields per test. */
export function listingPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: "End-to-end test listing in Hinjewadi",
    description:
      "A listing created by the automated test suite, with a description comfortably past the thirty-character minimum.",
    type: "APARTMENT",
    listingType: "SALE",
    price: 6_500_000,
    city: "Pune",
    locality: "Hinjewadi",
    bedrooms: 2,
    bathrooms: 2,
    areaSqft: 950,
    amenities: ["Lift"],
    contactName: "Test Owner",
    contactPhone: "+91 90000 11111",
    images: [],
    ...overrides,
  };
}

/** A listing as it appears in search results (see propertyCardSelect). */
export type SearchItem = {
  id: string;
  slug: string;
  title: string;
  type: "APARTMENT" | "VILLA" | "PLOT" | "COMMERCIAL";
  listingType: "RENT" | "SALE";
  price: number;
  city: string;
  locality: string;
  bedrooms: number;
  bathrooms: number;
  areaSqft: number;
  status: string;
};

export type SearchResponse = {
  ok: boolean;
  data: { items: SearchItem[]; total: number; page: number; pageCount: number };
};
