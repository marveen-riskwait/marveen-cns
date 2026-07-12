import { defineConfig } from "@playwright/test";

// E2E against the running admin SPA (port 5173), which proxies /api to the
// backend on 3001 — start the backend before running these tests (CI does this
// in a prior step; see .github/workflows/ci.yml).
//
// In sandboxes where Chromium lives at a fixed path, set PW_CHROMIUM_PATH.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "list" : "line",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    ...(process.env.PW_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
      : {}),
  },
  webServer: {
    command: "npm run dev -- --port 5173",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
