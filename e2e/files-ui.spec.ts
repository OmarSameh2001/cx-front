import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";

import { API_URL, USERS, uniqueName } from "./users";

// E1.3 on the real screens: a customer answers file questions on the public
// link (a PDF, and a large photo the browser compresses before uploading),
// then staff open the response and download the file.
// Needs cx-api on the seeded database with S3_* set in cx-api/.env.

test.describe.configure({ mode: "serial" });

let api: APIRequestContext; // Acme's org admin
let form: { id: number; token: string; name: string };
let submissionId: number;
const formName = uniqueName();

test.beforeAll(async () => {
  api = await request.newContext({ baseURL: API_URL, storageState: USERS.orgAdmin.storage });
  const res = await api.post("/forms", {
    data: {
      name: formName,
      type: "questionnaire",
      submitter_type: ["customer"],
      fields: [
        { question: "Your receipt", type: "file", order: 0, is_required: true, options: ["max_mb=1", "types=application/pdf"] },
        { question: "A photo of the branch", type: "file", order: 1 },
      ],
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const body = await res.json();
  await api.post(`/forms/${body.id}/activate`);
  form = { id: body.id, token: body.public_token, name: formName };
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

// A 3000x2000 photo-like JPEG (noisy, so it doesn't compress to nothing),
// made by the browser itself.
async function bigPhoto(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 3000;
    c.height = 2000;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(c.width, c.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const x = (i / 4) % c.width;
      img.data[i] = (x / 12) % 255;
      img.data[i + 1] = 120 + Math.random() * 40;
      img.data[i + 2] = 200;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.95));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
  return Buffer.from(b64, "base64");
}

test.describe("customer, not signed in", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("uploads a PDF and a compressed photo, and submits", async ({ page }) => {
    await page.goto(`/public/form/${form.token}`);
    await expect(page.getByRole("heading", { name: form.name })).toBeVisible();
    await page.getByLabel("Email").fill(`files-ui-${Date.now()}@example.com`);
    await page.getByLabel("First name").fill("Ann");
    await page.getByLabel("Last name").fill("Lee");

    const inputs = page.locator('input[type="file"]');
    // the question's own limits are shown before anything is picked
    await expect(page.getByText("PDF, up to 1.0 MB")).toBeVisible();

    // a file of the wrong type is refused in the browser, before uploading
    await inputs.nth(0).setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(page.getByText(/not allowed here/)).toBeVisible();

    await inputs.nth(0).setInputFiles({ name: "receipt.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 receipt") });
    // uploads go to Supabase from here, which can take several seconds
    await expect(page.getByText("receipt.pdf")).toBeVisible({ timeout: 30_000 });

    const photo = await bigPhoto(page);
    const started = page.waitForRequest((r) => r.url().endsWith("/uploads") && r.method() === "POST"
      && JSON.parse(r.postData() ?? "{}").name?.startsWith("branch"));
    // input 0 is now the first question's "Replace file"; 1 is the photo question
    await inputs.nth(1).setInputFiles({ name: "branch.jpg", mimeType: "image/jpeg", buffer: photo });
    const declared = JSON.parse((await started).postData()!);
    expect(declared.content_type, "compressed to WebP in the browser").toBe("image/webp");
    expect(declared.name).toBe("branch.webp");
    expect(declared.size, `smaller than the ${photo.length} byte original`).toBeLessThan(photo.length / 2);
    await expect(page.getByText("branch.webp")).toBeVisible({ timeout: 30_000 });

    const submit = page.waitForResponse((r) => r.url().endsWith("/submit"));
    await page.getByRole("button", { name: "Submit" }).click();
    const res = await submit;
    expect(res.status(), await res.text()).toBe(201);
    submissionId = (await res.json()).submission_id;
    await expect(page.getByRole("heading", { name: "Submitted" })).toBeVisible();
  });
});

test.describe("organisation admin", () => {
  test.use({ storageState: USERS.orgAdmin.storage });

  test("sees the files in the response and downloads one", async ({ page }) => {
    test.skip(!submissionId, "needs the customer's response");
    await page.goto(`/submissions/${submissionId}`);
    // uploads go to Supabase from here, which can take several seconds
    await expect(page.getByText("receipt.pdf")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("branch.webp")).toBeVisible({ timeout: 30_000 });
    // the photo shows its server-made thumbnail (or itself)
    await expect(page.locator('img[alt="branch.webp"]')).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download" }).first().click();
    expect((await download).suggestedFilename()).toBe("receipt.pdf");
  });
});
