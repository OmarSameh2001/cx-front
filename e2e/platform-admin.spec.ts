import { expect, test, type Page } from "@playwright/test";

import { USERS, uniqueName as unique } from "./users";

// E0.2: organisations are run by platform admins; each organisation sees only
// itself and its own roles; the API never creates system roles.
// Needs cx-api on the seeded database (`python scripts.py db:seed`).

function modal(page: Page, title: string) {
  return page.locator("div.fixed").filter({ has: page.getByRole("heading", { name: title }) });
}

function orgTable(page: Page) {
  return page.locator("div").filter({ has: page.getByRole("heading", { name: "Organisations" }) }).locator("table").first();
}

test.describe("organisation admin", () => {
  test.use({ storageState: USERS.orgAdmin.storage });

  test("sees only their own organisation", async ({ page }) => {
    await page.goto("/organisation");
    const rows = orgTable(page).locator("tbody tr");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Acme Corp");
  });

  test("cannot create an organisation", async ({ page }) => {
    await page.goto("/organisation");
    await expect(orgTable(page).locator("tbody tr")).toHaveCount(1);

    // the button still shows for role "admin"; the API must refuse
    await page.getByRole("button", { name: "Add Organisation" }).click();
    const form = modal(page, "Add Organisation");
    await form.locator("input").first().fill(unique());

    const create = page.waitForResponse((r) => r.url().endsWith("/organisations") && r.request().method() === "POST");
    await form.getByRole("button", { name: "Create" }).click();
    expect((await create).status()).toBe(403);
    await expect(page.getByText("Failed to create organisation.")).toBeVisible();

    await page.reload();
    await expect(orgTable(page).locator("tbody tr")).toHaveCount(1);
  });

  test("sees their organisation's roles, and cannot create a system role", async ({ page }) => {
    await page.goto("/roles");
    for (const name of ["admin", "manager", "agent"]) {
      await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();
    }

    const name = unique();
    await page.getByRole("button", { name: "Add Role" }).click();
    const form = modal(page, "Add Role");
    await form.locator("input[type=text]").first().fill(name);
    await form.getByLabel("System role").check();

    const create = page.waitForResponse((r) => r.url().endsWith("/roles") && r.request().method() === "POST");
    await form.getByRole("button", { name: "Create" }).click();
    const res = await create;
    expect(res.status()).toBe(201);
    expect((await res.json()).is_system).toBe(false);
    await expect(page.getByText("Role created.")).toBeVisible();
    const row = page.locator("tbody tr").filter({ has: page.getByRole("cell", { name, exact: true }) });
    await expect(row).toHaveCount(1);

    // a successful DELETE (204) must read as success in the UI
    await row.getByTitle("Delete").click();
    await page.locator("button:not([title])", { hasText: /^Delete$/ }).click();
    await expect(page.getByText("Role deleted.")).toBeVisible();
    await expect(row).toHaveCount(0);
  });
});

test.describe("platform admin", () => {
  test.use({ storageState: USERS.platformAdmin.storage });

  test("creates an organisation, then deletes it", async ({ page }) => {
    const name = unique();
    await page.goto("/organisation");
    await expect(orgTable(page).locator("tbody tr").first()).toBeVisible();

    await page.getByRole("button", { name: "Add Organisation" }).click();
    const form = modal(page, "Add Organisation");
    await form.locator("input").first().fill(name);

    const create = page.waitForResponse((r) => r.url().endsWith("/organisations") && r.request().method() === "POST");
    await form.getByRole("button", { name: "Create" }).click();
    const created = await (await create).json();
    expect(created.name).toBe(name);
    await expect(page.getByText("Organisation created.")).toBeVisible();

    const row = orgTable(page).locator("tbody tr").filter({ hasText: name });
    await expect(row).toHaveCount(1);

    // delete via the row's trash icon, then the confirm toast's button
    // (the toast button has no title; the trash icon's title is also "Delete")
    await row.getByTitle("Delete").click();
    const del = page.waitForResponse((r) => r.url().endsWith(`/organisations/${created.id}`) && r.request().method() === "DELETE");
    await page.locator("button:not([title])", { hasText: /^Delete$/ }).click();
    expect((await del).status()).toBe(204);
    await expect(page.getByText("Organisation deleted.")).toBeVisible();
    await expect(row).toHaveCount(0);
  });
});
