import { defineConfig, devices } from "@playwright/test";

// End-to-end tests. Run with `npm run e2e` (or `npm run e2e:ui` for the UI mode).
// The frontend is started automatically; the backend (cx-api) must be started
// separately for any test that talks to the API.
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    // Probe /login rather than / — the landing page is heavy and its first
    // dev compile can take a long time on this drive.
    url: `${BASE_URL}/login`,
    // Reuse an already running `npm run dev` locally; always start fresh in CI.
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
  },
});
