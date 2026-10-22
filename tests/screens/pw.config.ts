import { defineConfig } from "@playwright/test";

// End-to-end tests against a running app (npm run dev) and its database.
// Set PLAYWRIGHT_CHROMIUM_PATH to use a preinstalled Chromium.
export default defineConfig({
  testDir: ".",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
    screenshot: "only-on-failure",
  },
});
