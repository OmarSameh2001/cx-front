import { defineConfig, devices } from "@playwright/test";

// Browser tests that only need the API, not the Next.js pages: the browser
// just has to be on the frontend's origin, since CORS is what they check.
// Run with `npx playwright test -c playwright.api.config.ts`.
// The backend is started (or reused) the same way as in playwright.config.ts.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const WIN = process.platform === "win32";
const API_PYTHON = process.env.E2E_API_PYTHON ?? (WIN ? "venv\\Scripts\\python.exe" : "venv/bin/python");
// the same interpreter, from this folder
const PYTHON_HERE = WIN ? `..\\cx-api\\${API_PYTHON}` : `../cx-api/${API_PYTHON}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["files.spec.ts"],
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `${API_PYTHON} scripts.py dev --no-reload`,
      cwd: "../cx-api",
      url: `${API_URL}/docs`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // stands in for the frontend's origin: a real local server, so the
      // browser treats the page like the real app when it calls the API
      command: `${PYTHON_HERE} -m http.server 3000 --bind 127.0.0.1`,
      url: "http://localhost:3000/",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
