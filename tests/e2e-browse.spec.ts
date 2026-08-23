import { expect, test } from "@playwright/test";
import { ACCOUNTS, signInViaForm } from "./helpers";

test.describe("public browsing", () => {
  test("the landing page renders listings and cities", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Featured properties" })).toBeVisible();
    await expect(page.locator("article")).not.toHaveCount(0);
    await expect(page.getByRole("main").getByRole("heading", { name: "Popular cities" })).toBeVisible();
  });

  test("hero search navigates to filtered results", async ({ page }) => {
    await page.goto("/");
    await page.selectOption("#hero-city", "Mumbai");
    await page.click('button[type=submit]:has-text("Search")');

    await page.waitForURL(/\/properties\?/);
    expect(page.url()).toContain("city=Mumbai");
    await expect(page.getByRole("heading", { name: "Property in Mumbai" })).toBeVisible();
  });

  test("filters update the URL and the results", async ({ page }) => {
    await page.goto("/properties");
    await expect(page.locator("article")).not.toHaveCount(0);

    await page.getByLabel("Villa / Independent House").click();
    await page.waitForURL(/type=VILLA/);
    await expect(page.getByLabel("Villa / Independent House")).toBeChecked();

    // Results stream in behind a skeleton, so wait for them rather than
    // counting the moment the URL changes.
    await expect(page.locator("article").first()).toBeVisible();
    const count = await page.locator("article").count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(9); // narrower than the unfiltered first page
  });

  test("a filtered search survives a page reload", async ({ page }) => {
    // Filters live in the URL, so the results must be shareable.
    await page.goto("/properties?city=Pune&listingType=RENT");
    const before = await page.locator("article").count();

    await page.reload();
    expect(await page.locator("article").count()).toBe(before);
  });

  test("clear-all resets every filter", async ({ page }) => {
    await page.goto("/properties?city=Pune&type=VILLA&bedrooms=3");
    await page.getByRole("button", { name: "Clear all" }).click();

    await page.waitForURL((url) => url.pathname === "/properties" && url.search === "");
    await expect(page.locator("article")).toHaveCount(9);
  });

  test("sorting reorders the results", async ({ page }) => {
    await page.goto("/properties?listingType=SALE");
    await page.selectOption("#sort", "price_asc");
    await page.waitForURL(/sort=price_asc/);

    const first = await page.locator("article").first().textContent();
    await page.selectOption("#sort", "price_desc");
    await page.waitForURL(/sort=price_desc/);

    expect(await page.locator("article").first().textContent()).not.toBe(first);
  });

  test("an empty result set explains itself", async ({ page }) => {
    await page.goto("/properties?q=zzzznomatchzzzz");

    await expect(page.getByText("No properties match these filters")).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear all filters" })).toBeVisible();
  });

  test("pagination moves between pages", async ({ page }) => {
    await page.goto("/properties");
    const firstTitle = await page.locator("article h3").first().textContent();

    await page.getByRole("link", { name: "2", exact: true }).click();
    await page.waitForURL(/page=2/);

    expect(await page.locator("article h3").first().textContent()).not.toBe(firstTitle);
  });

  test("a listing detail page shows the full record", async ({ page }) => {
    await page.goto("/properties");
    await page.locator("article h3 a").first().click();
    await page.waitForURL(/\/properties\/[a-z0-9-]+$/);

    await expect(page.getByRole("heading", { name: "Property details" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "About this property" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Contact seller" })).toBeVisible();
  });

  test("the phone number is masked until revealed", async ({ page }) => {
    await page.goto("/properties");
    await page.locator("article h3 a").first().click();

    const reveal = page.getByRole("button", { name: /show number/ });
    await expect(reveal).toContainText("•");

    await reveal.click();

    // The button relabels itself to the full number, so the old name no longer
    // matches; assert on the aside that contains it.
    const seller = page.locator("aside");
    await expect(seller).not.toContainText("show number");
    await expect(seller).toContainText(/\+91/);
  });

  test("the gallery lightbox opens and closes", async ({ page }) => {
    await page.goto("/properties");
    await page.locator("article h3 a").first().click();

    await page.getByRole("button", { name: "Open image gallery" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("a missing listing returns a real 404", async ({ page }) => {
    const response = await page.goto("/properties/no-such-listing");

    // A soft 404 (status 200) would keep dead listings in the search index.
    expect(response?.status()).toBe(404);
    await expect(page.getByText("We couldn't find that page")).toBeVisible();
  });

  test("no page scrolls sideways on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const path of ["/", "/properties", "/login"]) {
      await page.goto(path);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `${path} overflows horizontally`).toBeLessThanOrEqual(clientWidth);
    }
  });
});

test.describe("SEO", () => {
  test("listing pages carry structured data and a canonical URL", async ({ page }) => {
    await page.goto("/properties");
    await page.locator("article h3 a").first().click();

    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(JSON.parse(jsonLd!)["@type"]).toBe("RealEstateListing");

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/properties\//);
  });

  test("the sitemap lists every approved listing", async ({ request }) => {
    const body = await (await request.get("/sitemap.xml")).text();

    // 20 listings + home + /properties + 8 city pages.
    expect((body.match(/<loc>/g) ?? []).length).toBe(30);
  });

  test("robots.txt keeps private areas out of the index", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();

    expect(body).toContain("/dashboard");
    expect(body).toContain("/api");
    expect(body).toContain("sitemap.xml");
  });
});

test.describe("authentication UI", () => {
  test("a signed-out visitor is redirected away from the dashboard", async ({ page }) => {
    await page.goto("/dashboard");

    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("next=%2Fdashboard");
  });

  test("signing in returns the visitor to where they were headed", async ({ page }) => {
    await page.goto("/dashboard/saved");
    await page.waitForURL(/\/login/);

    await page.fill("#email", ACCOUNTS.buyer);
    await page.fill("#password", "Password123");
    await page.click("button[type=submit]");

    await page.waitForURL(/\/dashboard\/saved/);
    await expect(page.getByRole("heading", { name: "Saved properties" })).toBeVisible();
  });

  test("a wrong password shows an inline error", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", ACCOUNTS.buyer);
    await page.fill("#password", "wrong-password");
    await page.click("button[type=submit]");

    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    expect(page.url()).toContain("/login");
  });

  test("signing out clears the session", async ({ page }) => {
    await signInViaForm(page, ACCOUNTS.buyer);

    await page.getByRole("button", { name: /Karan/ }).click();
    await page.getByRole("button", { name: "Sign out" }).click();

    await page.waitForURL("/");
    // Scoped to the header — the footer carries a "Sign in" link too.
    await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("registration creates an account and signs the user in", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: /I'm an owner/ }).click();
    await page.fill("#name", "Fresh Owner");
    await page.fill("#email", `fresh-${Date.now()}@example.com`);
    await page.fill("#password", "Password123");
    await page.click("button[type=submit]");

    // Sellers land straight on the post-property form.
    await page.waitForURL(/\/dashboard\/listings\/new/);
    await expect(page.getByRole("heading", { name: "Post a property" })).toBeVisible();
  });
});
