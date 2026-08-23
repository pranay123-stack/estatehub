import { defineConfig } from "vitest/config";


/**
 * Unit tests only — pure logic with no database or server.
 * API and browser coverage lives in Playwright (see playwright.config.ts).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
});
