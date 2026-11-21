import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";

import { API_URL, USERS, uniqueName } from "./users";

// E1.5: form versions through the real screens. Respondents always get the
// published version; the builder's deactivate → edit → activate publishes
// the next one; each response keeps the version it was answered on.
// Needs cx-api on the seeded database (`python scripts.py db:seed`).

test.describe.configure({ mode: "serial" });
// a few API round trips per test against the remote database
test.setTimeout(90_000);

const V1 = "How was your visit?";
const V2 = "How was your visit today?";
const V3 = "How was your stay?";

let api: APIRequestContext; // Acme's org admin: the form's creator
let form: { id: number; public_token: string };
let customerSubmission: number;
const formName = uniqueName();
const email = `${formName.replace(/\W+/g, "-").toLowerCase()}@example.com`;

type Version = { id: number; number: number };
const current = async (): Promise<{ current_version: Version; has_unpublished_changes: boolean; fields: { id: number; question: string }[] }> =>
  (await api.get(`/forms/${form.id}`)).json();

test.beforeAll(async () => {
  api = await request.newContext({ baseURL: API_URL, storageState: USERS.orgAdmin.storage });
  const res = await api.post("/forms", {
    data: {
      name: formName,
      type: "questionnaire",
      submitter_type: ["customer", "employee"],
      fields: [
        { question: V1, type: "single_choice", options: ["Good", "Bad"], is_required: true, order: 0 },
        { question: "Anything else?", type: "text", order: 1 },
      ],
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const created = await res.json();
  expect(created.current_version.number, "a new form is published as version 1").toBe(1);
  form = { id: created.id, public_token: created.public_token };
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

async function publicQuestion(page: Page, expected: string) {
  await page.goto(`/public/form/${form.public_token}`);
  await expect(page.getByRole("heading", { name: formName })).toBeVisible();
  await expect(page.getByText(`1. ${expected}`)).toBeVisible();
}

test.describe("customer, not signed in", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("answers version 1 by the public link", async ({ page }) => {
    await publicQuestion(page, V1);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("First name").fill("Vera");
    await page.getByLabel("Last name").fill("Sion");
    await page.getByLabel("Good").check();

    const submit = page.waitForResponse((r) => r.url().endsWith("/submit"));
    await page.getByRole("button", { name: "Submit" }).click();
    const res = await submit;
    expect(res.status()).toBe(201);
    customerSubmission = (await res.json()).submission_id;
    await expect(page.getByRole("heading", { name: "Submitted" })).toBeVisible();
  });
});

test.describe("organisation admin", () => {
  test.use({ storageState: USERS.orgAdmin.storage });

  test("rewords a question in the builder and activating publishes version 2", async ({ page }) => {
    await page.goto(`/form/${form.id}`);
    await expect(page.getByText("Deactivate the form before editing.")).toBeVisible();
    const deactivated = page.waitForResponse((r) => r.url().endsWith(`/forms/${form.id}/deactivate`));
    await page.getByRole("button", { name: "Deactivate", exact: true }).click();
    expect((await deactivated).status()).toBe(200);

    const question = page.getByPlaceholder("Question").first();
    await expect(question).toHaveValue(V1);
    await question.fill(V2);
    const saved = page.waitForResponse(
      (r) => r.url().endsWith(`/forms/${form.id}`) && r.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Save form" }).click();
    expect((await saved).status()).toBe(200);
    // saved to the draft only: version 1 is still what respondents get
    let state = await current();
    expect(state.current_version.number).toBe(1);
    expect(state.has_unpublished_changes).toBe(true);

    await page.goto(`/form/${form.id}`);
    const activated = page.waitForResponse((r) => r.url().endsWith(`/forms/${form.id}/activate`));
    await page.getByRole("button", { name: "Activate", exact: true }).click();
    const res = await activated;
    expect(res.status()).toBe(200);
    expect((await res.json()).current_version.number, "activating published the draft").toBe(2);
    state = await current();
    expect(state.has_unpublished_changes).toBe(false);
  });

  test("the customer's response still shows the version it answered", async ({ page }) => {
    await page.goto(`/submissions/${customerSubmission}`);
    await expect(page.getByText(`1. ${V1}`)).toBeVisible();
    await expect(page.getByText(V2)).toHaveCount(0);
  });

  test("an attempt started before a publish finishes on its own version", async ({ page }) => {
    // the admin is also an employee respondent: start an attempt on version 2
    await page.goto(`/exam/${form.id}`);
    await expect(page.getByText(`1. ${V2}`)).toBeVisible();
    await page.getByLabel("Good").check();

    // meanwhile the draft is edited while the form is live, then published
    const state = await current();
    const fields = state.fields.map((f, i) => (i === 0 ? { ...f, question: V3 } : f));
    const edited = await api.patch(`/forms/${form.id}`, { data: { fields } });
    expect(edited.status(), await edited.text()).toBe(200);
    expect((await api.post(`/forms/${form.id}/publish`)).status()).toBe(200);
    expect((await current()).current_version.number).toBe(3);

    // the open attempt keeps version 2, even after a reload
    await page.reload();
    await expect(page.getByText(`1. ${V2}`)).toBeVisible();
    await expect(page.getByText(V3)).toHaveCount(0);
    await page.getByLabel("Good").check();

    const submitted = page.waitForResponse((r) => /\/submissions\/\d+\/submit$/.test(r.url()));
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    await page
      .locator("div.flex-col", { has: page.getByText(/^Submit (answers|with unanswered questions)\?$/) })
      .last()
      .getByRole("button", { name: "Submit", exact: true })
      .click();
    const res = await submitted;
    expect(res.status()).toBe(200);
    const submission = await res.json();
    const versions: Version[] = await (await api.get(`/forms/${form.id}/versions`)).json();
    expect(submission.form_version_id).toBe(versions.find((v) => v.number === 2)!.id);

    await page.waitForURL(/\/submissions\/\d+$/);
    await expect(page.getByText(`1. ${V2}`)).toBeVisible();
  });

  test("version history counts each response under its version", async () => {
    const versions: (Version & { submission_count: number })[] = await (
      await api.get(`/forms/${form.id}/versions`)
    ).json();
    expect(versions.map((v) => `${v.number}:${v.submission_count}`)).toEqual(["3:0", "2:1", "1:1"]);
    const diff = await (await api.get(`/forms/${form.id}/versions/3/diff`)).json();
    expect(diff.questions.changed.map((c: { changes: string[] }) => c.changes)).toEqual([["question"]]);
  });
});

test.describe("customer, after the publishes", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the public link serves the latest version, never the draft", async ({ page }) => {
    await publicQuestion(page, V3);
    // an unpublished draft edit stays out of the public form
    const state = await current();
    const fields = state.fields.map((f, i) => (i === 0 ? { ...f, question: "DRAFT ONLY" } : f));
    expect((await api.patch(`/forms/${form.id}`, { data: { fields } })).status()).toBe(200);
    await page.reload();
    await expect(page.getByText(`1. ${V3}`)).toBeVisible();
    await expect(page.getByText("DRAFT ONLY")).toHaveCount(0);
  });
});
