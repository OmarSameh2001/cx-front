import { expect, test as setup } from "@playwright/test";

import { PASSWORD, USERS } from "./users";

// Opens each route the tests use once, one at a time, before any test runs.
// Against the production build (playwright.config.ts) they're already
// compiled, so this is a quick check that each one renders; it also keeps a
// run against `next dev` from timing out on cold routes.
const ROUTES = ["/", "/organisation", "/roles", "/form/0/submissions", "/public/form/warm-up"];

setup("compile the routes the tests use", async ({ page }) => {
  setup.setTimeout(5 * 60_000);
  for (const route of ROUTES) {
    await page.goto(route, { timeout: 2 * 60_000 });
  }
});

// Signs each seeded user in through the real login page and saves the session
// (auth cookies + the user/permissions the app keeps in localStorage).
for (const [name, user] of Object.entries(USERS)) {
  setup(`sign in as ${name}`, async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(user.email);
    await page.getByLabel("Password").fill(PASSWORD);

    const login = page.waitForResponse((r) => r.url().endsWith("/auth/employee/login"));
    await page.getByRole("button", { name: "Login" }).click();
    expect((await login).status(), `login as ${user.email}`).toBe(200);

    // the login page sends signed-in users home
    await page.waitForURL((url) => url.pathname === "/");
    await page.context().storageState({ path: user.storage });
  });
}
