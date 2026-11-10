import { expect, test as setup } from "@playwright/test";

import { PASSWORD, USERS } from "./users";

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
