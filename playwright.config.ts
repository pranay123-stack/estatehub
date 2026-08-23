import { defineConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Load .env.test so the server and the tests agree on which database they are
// talking to. Deliberately NOT `override: true`: in CI the database URL comes
// from the job environment, and overriding it would point the suite at a
// nonexistent local port. Locally the shell has no DATABASE_URL, so .env.test
// fills it in. tests/global-setup.ts refuses to run against a URL that is not
// obviously a test database, which is the real safety net either way.
loadEnv({ path: ".env.test" });

const PORT = 3399;

/**
 * API and browser coverage. Runs the real production build against a throwaway
 * database — the same code path that ships, not a mocked stand-in.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // tests share one database
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  webServer: {
    // `next build` then `next start`: exercises the production output, which is
    // where the public/-snapshot class of bug only ever shows up.
    command: `npm run build && npx next start --port ${PORT}`,
    // Health-check a route with no database dependency. Playwright starts the
    // web server BEFORE globalSetup, so /api/properties would still be 500ing
    // (no tables yet) and the poll would time out. This only needs to prove the
    // server is listening.
    url: `http://localhost:${PORT}/robots.txt`,
    // A cold CI runner builds from scratch with no Turbopack cache.
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: process.env.DATABASE_URL!,
      AUTH_SECRET: process.env.AUTH_SECRET!,
      STORAGE_DRIVER: "local",
      LOCAL_UPLOAD_DIR: process.env.LOCAL_UPLOAD_DIR!,
      NODE_ENV: "production",
    },
  },

  globalSetup: "./tests/global-setup.ts",
});
