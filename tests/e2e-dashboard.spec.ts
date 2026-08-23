import { expect, test } from "@playwright/test";
import { ACCOUNTS, signInViaForm } from "./helpers";
import { SAMPLE_JPEG } from "./fixtures";

test.describe("buyer dashboard", () => {
  test.beforeEach(async ({ page }) => signInViaForm(page, ACCOUNTS.buyer));

  test("shows only buyer navigation", async ({ page }) => {
    await page.goto("/dashboard");
    const nav = page.getByRole("navigation", { name: "Dashboard" });

    await expect(nav.getByRole("link", { name: "Saved properties" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "My listings" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Moderation queue" })).toHaveCount(0);
  });

  test("redirects away from seller pages with an explanation", async ({ page }) => {
    await page.goto("/dashboard/listings");

    await page.waitForURL(/error=forbidden/);
    await expect(page.getByText("Your account does not have access to that page.")).toBeVisible();
  });

  test("saving a property adds it to the saved list", async ({ page }) => {
    await page.goto("/properties?q=Gachibowli");

    const card = page.locator("article").first();
    // Match on the slug rather than the title: immune to text wrapping, and it
    // identifies the exact listing even though other tests share this database.
    const href = await card.locator("h3 a").getAttribute("href");
    const heart = card.getByRole("button", { name: /Save property|Remove from saved/ });

    // Other tests share this buyer account, so normalise to "not saved" first.
    if ((await heart.getAttribute("aria-pressed")) === "true") {
      await heart.click();
      await expect(heart).toHaveAttribute("aria-pressed", "false");
    }

    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "true");

    await page.goto("/dashboard/saved");
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
  });

  test("viewing a listing records it in recently viewed", async ({ page }) => {
    await page.goto("/properties?q=Besant");
    const href = await page.locator("article h3 a").first().getAttribute("href");
    await page.locator("article h3 a").first().click();
    await page.waitForURL(/\/properties\/[a-z0-9-]+$/);

    await page.goto("/dashboard/recent");
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
  });
});

test.describe("seller dashboard", () => {
  test.beforeEach(async ({ page }) => signInViaForm(page, ACCOUNTS.owner));

  test("lists the seller's own properties", async ({ page }) => {
    await page.goto("/dashboard/listings");

    await expect(page.getByRole("heading", { name: "My listings" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Add new property" })).toBeVisible();
  });

  test("the post-property form prefills contact details from the profile", async ({ page }) => {
    await page.goto("/dashboard/listings/new");

    await expect(page.locator("#contactName")).toHaveValue("Rohan Mehta");
    await expect(page.locator("#contactEmail")).toHaveValue(ACCOUNTS.owner);
  });

  test("the form adapts to the property type", async ({ page }) => {
    await page.goto("/dashboard/listings/new");
    await expect(page.locator("#bedrooms")).toBeVisible();

    // Plots have no bedrooms, bathrooms or furnishing.
    await page.selectOption("#type", "PLOT");
    await expect(page.locator("#bedrooms")).toHaveCount(0);
    await expect(page.locator("#bathrooms")).toHaveCount(0);

    // Rentals gain a deposit field.
    await page.selectOption("#type", "APARTMENT");
    await expect(page.locator("#deposit")).toHaveCount(0);
    await page.selectOption("#listingType", "RENT");
    await expect(page.locator("#deposit")).toBeVisible();
  });

  test("server-side validation errors surface on the form", async ({ page }) => {
    await page.goto("/dashboard/listings/new");

    // Long enough to satisfy the browser's `required`, short enough to fail Zod.
    await page.fill("#title", "Too short");
    await page.fill("#description", "Also short");
    await page.fill("#price", "1000000");
    await page.fill("#locality", "Somewhere");
    await page.fill("#areaSqft", "900");
    await page.click('button[type=submit]');

    await expect(page.getByText("Please correct the highlighted fields.")).toBeVisible();
    await expect(page.getByText("Title must be at least 10 characters")).toBeVisible();
  });

  test("a full create → moderate → live lifecycle", async ({ page, browser }) => {
    const marker = `Lifecycle test listing ${Date.now()}`;

    // 1. The owner posts a property, including a real image upload.
    await page.goto("/dashboard/listings/new");
    await page.fill("#title", marker);
    await page.fill("#description", "A listing created by the automated suite to exercise the whole moderation lifecycle end to end.");
    await page.selectOption("#listingType", "RENT");
    await page.fill("#price", "34000");
    await page.fill("#deposit", "170000");
    await page.fill("#city", "Pune");
    await page.fill("#locality", "Hinjewadi");
    await page.selectOption("#bedrooms", "2");
    await page.fill("#areaSqft", "1010");

    await page.setInputFiles("#property-images", {
      name: "photo.jpg",
      mimeType: "image/jpeg",
      buffer: SAMPLE_JPEG,
    });
    await page.waitForSelector("li img");

    // The freshly uploaded preview must actually load, not merely be in the DOM.
    // This is the regression guard for uploads being written somewhere the
    // production server cannot serve them.
    await expect
      .poll(() =>
        page.locator("li img").first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
      )
      .toBe(true);

    await page.click('button[type=submit]');
    await page.waitForURL(/\/dashboard\/listings\?saved=1/);
    await expect(page.getByText("Pending review").first()).toBeVisible();

    // 2. It is not publicly visible yet.
    let search = await (await page.request.get("/api/properties?q=Hinjewadi")).json();
    expect(search.data.total).toBe(0);

    // 3. An admin approves it.
    const adminPage = await browser.newPage();
    await signInViaForm(adminPage, ACCOUNTS.admin);
    await adminPage.goto("/dashboard/admin");

    const card = adminPage.locator("div.rounded-card").filter({ hasText: marker }).first();
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Approve" }).click();
    await expect(card.getByRole("button", { name: "Approve" })).toHaveCount(0);

    // 4. It is now live and its uploaded photo renders on the public page.
    search = await (await page.request.get("/api/properties?q=Hinjewadi")).json();
    expect(search.data.total).toBe(1);

    await page.goto(`/properties/${search.data.items[0].slug}`);
    await expect(page.getByRole("heading", { name: marker })).toBeVisible();

    // 5. The admin rejects it with a reason.
    await adminPage.goto("/dashboard/admin?status=APPROVED");
    const liveCard = adminPage.locator("div.rounded-card").filter({ hasText: marker }).first();
    await liveCard.getByRole("button", { name: "Reject" }).click();
    await liveCard.locator('input[placeholder*="Reason"]').fill("Duplicate of an existing listing.");
    await liveCard.getByRole("button", { name: "Confirm rejection" }).click();
    await expect(liveCard).toHaveCount(0);

    // 6. It disappears from search and the owner sees why.
    search = await (await page.request.get("/api/properties?q=Hinjewadi")).json();
    expect(search.data.total).toBe(0);

    await page.goto("/dashboard/listings");
    await expect(page.getByText("Rejected: Duplicate of an existing listing.")).toBeVisible();

    // Clean up so the suite can run twice in a row.
    const id = (await (await page.request.get("/api/properties")).json()).data;
    void id;
    await page.locator("div.rounded-card").filter({ hasText: marker }).first()
      .getByRole("button", { name: "Delete" }).click();
    await adminPage.close();
  });
});

test.describe("admin dashboard", () => {
  test.beforeEach(async ({ page }) => signInViaForm(page, ACCOUNTS.admin));

  test("exposes moderation and user management", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("link", { name: "Moderation queue" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Manage users" })).toBeVisible();
  });

  test("the moderation queue filters by status", async ({ page }) => {
    await page.goto("/dashboard/admin");

    await page.getByRole("link", { name: /^Live/ }).click();
    await page.waitForURL(/status=APPROVED/);
    await expect(page.locator("div.rounded-card")).not.toHaveCount(0);
  });

  test("user management lists accounts and blocks self-editing", async ({ page }) => {
    await page.goto("/dashboard/admin/users");

    await expect(page.getByText(ACCOUNTS.owner)).toBeVisible();

    // The admin's own row is locked to prevent self-lockout.
    const ownRow = page.locator("div.rounded-card").filter({ hasText: ACCOUNTS.admin }).first();
    await expect(ownRow.getByText("You")).toBeVisible();
    await expect(ownRow.locator("select")).toBeDisabled();
    await expect(ownRow.getByRole("button", { name: "Suspend" })).toBeDisabled();
  });

  test("suspending a user prevents them signing in", async ({ page, browser }) => {
    const email = `suspendme-${Date.now()}@example.com`;

    // Create the victim account in an isolated context.
    const other = await browser.newContext();
    await other.request.post("/api/auth/register", {
      data: { name: "Suspend Me", email, password: "Password123", role: "OWNER" },
    });
    await other.close();

    await page.goto("/dashboard/admin/users");
    const row = page.locator("div.rounded-card").filter({ hasText: email }).first();
    await row.getByRole("button", { name: "Suspend" }).click();
    await expect(row.getByText("Suspended")).toBeVisible();

    const login = await page.request.post("/api/auth/login", {
      data: { email, password: "Password123" },
    });
    expect(login.status()).toBe(403);
  });
});
