import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";

import { API_URL, USERS, uniqueName } from "./users";

// E0.4: a customer answers a public link without logging in. A returning
// customer (same email) is accepted even with different details, the stored
// customer is not overwritten, and staff see the name given each time.
// Needs cx-api on the seeded database (`python scripts.py db:seed`).

test.describe.configure({ mode: "serial" });

let api: APIRequestContext; // signed in as Acme's org admin
let form: { id: number; public_token: string };
const formName = uniqueName();
const email = `${formName.replace(/\W+/g, "-").toLowerCase()}@example.com`;

test.beforeAll(async () => {
  api = await request.newContext({ baseURL: API_URL, storageState: USERS.orgAdmin.storage });
  const res = await api.post("/forms", {
    data: {
      name: formName,
      type: "questionnaire",
      submitter_type: ["customer"],
      fields: [
        { question: "How was your visit?", type: "single_choice", options: ["Good", "Bad"], is_required: true, order: 0 },
        { question: "Anything else?", type: "text", order: 1 },
      ],
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const created = await res.json();
  await api.post(`/forms/${created.id}/activate`);
  form = { id: created.id, public_token: created.public_token };
  expect(form.public_token, "questionnaire for customers gets a public link").toBeTruthy();
});

// Forms with responses can't be deleted: archive it and revoke its link.
test.afterAll(async () => {
  if (form) {
    await api.post(`/forms/${form.id}/deactivate`);
    await api.delete(`/forms/${form.id}/public-token`);
    await api.patch(`/forms/${form.id}`, { data: { is_archived: true } });
  }
  await api.dispose();
});

async function answerAsCustomer(page: Page, firstName: string, lastName: string) {
  await page.goto(`/public/form/${form.public_token}`);
  await expect(page.getByRole("heading", { name: formName })).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("First name").fill(firstName);
  await page.getByLabel("Last name").fill(lastName);
  await page.getByLabel("Good").check();

  const submit = page.waitForResponse((r) => r.url().endsWith("/submit"));
  await page.getByRole("button", { name: "Submit" }).click();
  expect((await submit).status()).toBe(201);
  await expect(page.getByRole("heading", { name: "Submitted" })).toBeVisible();
}

test.describe("customer, not signed in", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("answers the form by its public link", async ({ page }) => {
    await answerAsCustomer(page, "Ann", "Lee");
  });

  test("answers again with the same email but different details", async ({ page }) => {
    // used to be refused as a details mismatch
    await answerAsCustomer(page, "Annie", "Lee-Smith");
  });
});

test.describe("organisation admin", () => {
  test.use({ storageState: USERS.orgAdmin.storage });

  test("sees both responses under the name given each time", async ({ page }) => {
    await page.goto(`/form/${form.id}/submissions`);
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(2);
    await expect(page.getByRole("cell", { name: "Ann Lee", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Annie Lee-Smith", exact: true })).toBeVisible();

    // both went to one customer of Acme's, which kept the first details
    const subs = (await (await api.get(`/submissions?form_id=${form.id}`)).json()).items;
    expect(new Set(subs.map((s: { customer_id: number }) => s.customer_id)).size).toBe(1);
    const detail = await (await api.get(`/submissions/${subs[0].id}/detail`)).json();
    expect(detail.contact.email).toBe(email);
  });
});
