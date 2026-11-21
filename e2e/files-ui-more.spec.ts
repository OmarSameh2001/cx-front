import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";

import { API_URL, USERS, uniqueName } from "./users";

// E1.3 screens not covered by files-ui.spec.ts: an employee answering a file
// question, the builder's per-question limits, the organisation logo, and
// the upload screens at phone width (no sideways scrolling).
// Needs cx-api on the seeded database with S3_* set in cx-api/.env.

test.describe.configure({ mode: "serial" });
// real uploads to Supabase take several seconds each from a dev machine
test.setTimeout(120_000);

let admin: APIRequestContext; // Acme's org admin
let platform: APIRequestContext;
const toArchive: number[] = [];

test.beforeAll(async () => {
  admin = await request.newContext({ baseURL: API_URL, storageState: USERS.orgAdmin.storage });
  platform = await request.newContext({ baseURL: API_URL, storageState: USERS.platformAdmin.storage });
});

test.afterAll(async () => {
  for (const id of toArchive) {
    await admin.post(`/forms/${id}/deactivate`);
    await admin.delete(`/forms/${id}/public-token`);
    await admin.patch(`/forms/${id}`, { data: { is_archived: true } });
  }
  await admin.dispose();
  await platform.dispose();
});

async function createForm(submitter: string[], options: string[] = [], activate = true) {
  const res = await admin.post("/forms", {
    data: {
      name: uniqueName(),
      type: "questionnaire",
      submitter_type: submitter,
      fields: [{ question: "Attach the report", type: "file", order: 0, is_required: true, options }],
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const body = await res.json();
  // new forms start active; the builder only edits inactive ones
  await admin.post(`/forms/${body.id}/${activate ? "activate" : "deactivate"}`);
  return body as { id: number; public_token: string | null; fields: { id: number; options: string[] | null }[] };
}

async function pngFromBrowser(page: Page, size: number): Promise<Buffer> {
  const b64 = await page.evaluate(async (side) => {
    const c = document.createElement("canvas");
    c.width = c.height = side;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#c81e1e";
    ctx.fillRect(0, 0, side, side);
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }, size);
  return Buffer.from(b64, "base64");
}

async function noSidewaysScroll(page: Page) {
  const { scroll, width } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  expect(scroll, "page fits the phone's width").toBeLessThanOrEqual(width);
}

test.describe("employee", () => {
  test.use({ storageState: USERS.orgAdmin.storage });

  test("answers a file question on the form page and sees it in the response", async ({ page }) => {
    const form = await createForm(["employee"]);
    toArchive.push(form.id);
    await page.goto(`/exam/${form.id}`);
    await expect(page.getByText("Attach the report")).toBeVisible();

    await page.locator('input[type="file"]').first().setInputFiles({
      name: "monthly.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 monthly"),
    });
    await expect(page.getByText("monthly.pdf")).toBeVisible({ timeout: 30_000 });

    // removing clears the answer; uploading again brings it back
    await page.getByRole("button", { name: "Remove file" }).click();
    await expect(page.getByText("monthly.pdf")).toHaveCount(0);
    await page.locator('input[type="file"]').first().setInputFiles({
      name: "monthly-v2.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 monthly v2"),
    });
    await expect(page.getByText("monthly-v2.pdf")).toBeVisible({ timeout: 30_000 });

    const submitted = page.waitForResponse((r) => /\/submissions\/\d+\/submit$/.test(r.url()));
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    // then "Submit" again in the confirm toast
    await page
      .locator("div.flex-col", { has: page.getByText("Submit answers?", { exact: true }) })
      .last()
      .getByRole("button", { name: "Submit", exact: true })
      .click();
    expect((await submitted).status()).toBe(200);
    await page.waitForURL(/\/submissions\/\d+$/);
    await expect(page.getByText("monthly-v2.pdf")).toBeVisible();
    await expect(page.getByRole("button", { name: /Download/ })).toBeVisible();
  });

  test("sets a file question's limits in the builder", async ({ page }) => {
    const form = await createForm(["employee"], [], false);
    await page.goto(`/form/${form.id}`);
    await page.getByLabel("Max size (MB)").fill("2");
    await page.getByLabel("Allowed files").selectOption({ label: "PDF only" });
    await page.getByLabel("Keep original images (no compression)").check();
    await expect(page.getByText("PDF only, up to 2 MB")).toBeVisible();

    const saved = page.waitForResponse((r) => r.url().endsWith(`/forms/${form.id}`) && ["PATCH", "PUT"].includes(r.request().method()));
    await page.getByRole("button", { name: "Save form" }).click();
    expect((await saved).status()).toBe(200);

    const stored = await (await admin.get(`/forms/${form.id}`)).json();
    expect(stored.fields[0].options.sort()).toEqual(["keep_original=true", "max_mb=2", "types=application/pdf"]);
    const limitsUrl = `/files/limits/question?form_id=${form.id}&field_id=${stored.fields[0].id}`;
    // saved to the draft (E1.5): respondents keep the published limits until it's activated
    expect((await (await admin.get(limitsUrl)).json()).max_mb).toBe(10);
    expect((await admin.post(`/forms/${form.id}/activate`)).status()).toBe(200);
    const limits = await (await admin.get(limitsUrl)).json();
    expect(limits.max_mb).toBe(2);
    expect(limits.image.keep_original).toBe(true);
    await admin.post(`/forms/${form.id}/deactivate`);
    await admin.delete(`/forms/${form.id}`); // no responses, so it can go
  });
});

test.describe("platform admin", () => {
  test.use({ storageState: USERS.platformAdmin.storage });

  test("uploads an organisation logo", async ({ page }) => {
    const name = uniqueName();
    const created = await platform.post("/organisations", { data: { name } });
    expect(created.status(), await created.text()).toBe(201);
    const org = await created.json(); // removed by cleanup.teardown.ts (E2E prefix)

    await page.goto("/organisation");
    const row = page.locator("tr", { hasText: name });
    await expect(row).toBeVisible();
    await row.getByTitle("Edit").click();
    await page.locator('input[type="file"][accept*="image/png"]').setInputFiles({
      name: "logo.png", mimeType: "image/png", buffer: await pngFromBrowser(page, 800),
    });
    await expect(page.getByRole("img", { name: "Organisation logo" })).toBeVisible({ timeout: 30_000 });

    const saved = page.waitForResponse((r) => r.url().endsWith(`/organisations/${org.id}`) && r.request().method() === "PATCH");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const res = await saved;
    expect(res.status(), await res.text()).toBe(200);

    const read = await (await platform.get(`/organisations/${org.id}`)).json();
    expect(read.logo_file_id).toBeTruthy();
    expect(read.logo).toContain("supabase.co");
  });
});

test.describe("at phone width", () => {
  test.use({ viewport: { width: 375, height: 780 }, isMobile: true, hasTouch: true });

  test.describe("customer", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("the public form's file question fits and uploads", async ({ page }) => {
      const form = await createForm(["customer"]);
      toArchive.push(form.id);
      await page.goto(`/public/form/${form.public_token}`);
      await expect(page.getByText("Tap to upload")).toBeVisible();
      await noSidewaysScroll(page);
      await page.locator('input[type="file"]').first().setInputFiles({
        name: "a-rather-long-file-name-for-a-small-phone-screen.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 phone"),
      });
      await expect(page.getByText(/a-rather-long-file-name/)).toBeVisible({ timeout: 30_000 });
      await noSidewaysScroll(page);
    });
  });

  test.describe("staff", () => {
    test.use({ storageState: USERS.orgAdmin.storage });

    test("the response page's file answer fits", async ({ page }) => {
      const form = await createForm(["customer"]);
      toArchive.push(form.id);
      // answer it through the API, then look at it on a phone
      const pub = await request.newContext({ baseURL: API_URL });
      const start = await (await pub.post(`/public/forms/${form.public_token}/uploads`, {
        data: { field_id: form.fields[0].id, name: "a-long-name-for-the-response-view.pdf", content_type: "application/pdf", size: 9 },
      })).json();
      expect((await fetch(start.upload.url, { method: "PUT", headers: start.upload.headers, body: "%PDF-1.4x" })).status).toBe(200);
      await pub.post(`/public/forms/${form.public_token}/uploads/${start.file.id}/complete`, { data: { file_token: start.file_token } });
      const sub = await (await pub.post(`/public/forms/${form.public_token}/submit`, {
        data: {
          customer: { email: `phone-${Date.now()}@example.com`, first_name: "P", last_name: "Hone" },
          answers: { [form.fields[0].id]: { file_id: start.file.id, token: start.file_token } },
        },
      })).json();
      await pub.dispose();

      await page.goto(`/submissions/${sub.submission_id}`);
      await expect(page.getByText(/a-long-name-for-the-response-view/)).toBeVisible();
      await expect(page.getByRole("button", { name: /Download/ })).toBeVisible();
      await noSidewaysScroll(page);
    });
  });
});
