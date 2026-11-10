import { defineConfig, devices } from "@playwright/test";

// End-to-end tests. Run with `npm run e2e` (or `npm run e2e:ui` for the UI mode).
// Both servers are started automatically, or reused if already running:
//   - frontend: `npm run dev` on :3000
//   - backend:  `python scripts.py dev` in ../cx-api on :8000, against the
//               DATABASE_URL in cx-api/.env (seeded with `db:seed`)
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// The cx-api virtualenv's python; override with E2E_API_PYTHON (e.g. in CI).
const API_PYTHON =
  process.env.E2E_API_PYTHON ??
  (process.platform === "win32" ? "venv\\Scripts\\python.exe" : "venv/bin/python");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    // a cold `next dev` route can take a while to compile on first visit
    navigationTimeout: 60_000,
  },
  projects: [
    // Logs in once per seeded user and saves the session to .auth/; after all
    // tests, "cleanup" removes the data they created.
    { name: "setup", testMatch: /.*\.setup\.ts/, teardown: "cleanup" },
    { name: "cleanup", testMatch: /.*\.teardown\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      command: `${API_PYTHON} scripts.py dev --no-reload`,
      cwd: "../cx-api",
      url: `${API_URL}/docs`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "npm run dev",
      // Probe /login rather than / — the landing page is heavy and its first
      // dev compile can take a long time on this drive.
      url: `${BASE_URL}/login`,
      // Reuse an already running `npm run dev` locally; always start fresh in CI.
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: "pipe",
    },
  ],
});
