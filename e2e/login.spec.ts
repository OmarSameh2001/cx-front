import { expect, test } from "@playwright/test";

// Sanity check that Playwright, the dev server and the browser all work.
// Does not need the backend running.
test("login page renders the sign-in form", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByText("Welcome to Customer Experience")).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
});
