import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";

import { API_URL, PASSWORD, USERS, uniqueName } from "./users";

// E1.3 from a real browser on the frontend's origin: the page talks to the
// API, then sends the bytes straight to Supabase Storage (a cross-origin PUT,
// so this is the CORS check curl can't do), confirms, and downloads.
// Needs cx-api on the seeded database with S3_* set in cx-api/.env.
//
// The page only has to be on the frontend's origin, since that is the origin
// the browser enforces CORS for. Any page there will do: under
// playwright.config.ts it's Next's 404 page; playwright.api.config.ts serves
// the origin with a tiny static server instead, so these run without `next dev`.

const FRONT_ORIGIN = "http://localhost:3000";

async function openBlankPage(page: Page) {
  await page.goto(`${FRONT_ORIGIN}/e2e-blank`);
}

test.describe.configure({ mode: "serial" });

let api: APIRequestContext; // Acme's org admin
let adminState: Awaited<ReturnType<APIRequestContext["storageState"]>>;
let form: { id: number; token: string; docField: number; photoField: number };
const created: number[] = []; // file ids to delete afterwards

test.beforeAll(async () => {
  // signs in through the API (cookies are per host, so the browser on
  // localhost:3000 sends them to the API on localhost:8000 too)
  api = await request.newContext({ baseURL: API_URL });
  const login = await api.post("/auth/employee/login", { data: { email: USERS.orgAdmin.email, password: PASSWORD } });
  expect(login.status(), "sign in as Acme's org admin").toBe(200);
  adminState = await api.storageState();
  const res = await api.post("/forms", {
    data: {
      name: uniqueName(),
      type: "questionnaire",
      submitter_type: ["employee", "customer"],
      fields: [
        { question: "Your report", type: "file", order: 0, options: ["max_mb=1", "types=application/pdf"] },
        { question: "A photo", type: "file", order: 1 },
      ],
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const body = await res.json();
  await api.post(`/forms/${body.id}/activate`);
  form = {
    id: body.id,
    token: body.public_token,
    docField: body.fields.find((f: { order: number }) => f.order === 0).id,
    photoField: body.fields.find((f: { order: number }) => f.order === 1).id,
  };
});

test.afterAll(async () => {
  for (const id of created) await api.delete(`/files/${id}`);
  if (form) {
    await api.post(`/forms/${form.id}/deactivate`);
    await api.delete(`/forms/${form.id}/public-token`);
    await api.patch(`/forms/${form.id}`, { data: { is_archived: true } });
  }
  await api.dispose();
});

type FlowResult = {
  start: number;
  put: number;
  complete: number;
  file?: { id: number; status: string; content_type: string; size: number };
  downloaded?: string;
  error?: string;
};

// The whole upload, run inside the page (so the browser's CORS rules apply).
async function uploadInBrowser(
  page: Page,
  opts: { startPath: string; startBody: object; completePath: (id: number) => string; content: string; type: string },
): Promise<FlowResult & { token?: string }> {
  return page.evaluate(async ({ api, opts }) => {
    const json = { "Content-Type": "application/json" };
    const out: Record<string, unknown> = {};
    let step = "start";
    try {
      const start = await fetch(api + opts.startPath, {
        method: "POST", credentials: "include", headers: json, body: JSON.stringify(opts.startBody),
      });
      out.start = start.status;
      if (!start.ok) return { ...out, error: await start.text() } as never;
      const s = await start.json();
      out.token = s.file_token;
      step = "put to storage";
      const put = await fetch(s.upload.url, {
        method: s.upload.method, headers: s.upload.headers, body: new Blob([opts.content], { type: opts.type }),
      });
      out.put = put.status;
      step = "complete";
      const completePath = opts.completePath.replace("{id}", String(s.file.id));
      const complete = await fetch(api + completePath, {
        method: "POST", credentials: "include", headers: json, body: JSON.stringify({ file_token: s.file_token }),
      });
      out.complete = complete.status;
      out.file = await complete.json();
    } catch (e) {
      out.error = `${step}: ${e}`;
    }
    return out as never;
  }, { api: API_URL, opts: { ...opts, completePath: opts.completePath(0).replace("/0/", "/{id}/") } });
}

test.describe("signed-in employee", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies(adminState.cookies);
  });

  test("uploads from the browser straight to storage and downloads it", async ({ page }) => {
    await openBlankPage(page);
    const content = "%PDF-1.4 uploaded from a real browser";
    const r = await uploadInBrowser(page, {
      startPath: "/files/uploads",
      startBody: { purpose: "form_answer", name: "browser.pdf", content_type: "application/pdf",
                   size: content.length, form_id: form.id, field_id: form.docField },
      completePath: (id) => `/files/${id}/complete`,
      content, type: "application/pdf",
    });
    expect(r.start, r.error).toBe(201);
    expect(r.put, `the cross-origin PUT to Supabase passes CORS (${r.error ?? ""})`).toBe(200);
    expect(r.complete).toBe(200);
    expect(r.file?.status).toBe("ready");
    created.push(r.file!.id);

    const downloaded = await page.evaluate(async ({ api, id }) => {
      const link = await (await fetch(`${api}/files/${id}/link`, { credentials: "include" })).json();
      return (await fetch(link.url)).text();
    }, { api: API_URL, id: r.file!.id });
    expect(downloaded, "the browser can read the download link cross-origin").toBe(content);
  });

  test("is refused a file over the question's limit before anything is uploaded", async ({ page }) => {
    await openBlankPage(page);
    const status = await page.evaluate(async ({ api, body }) => (await fetch(`${api}/files/uploads`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })).status, { api: API_URL, body: { purpose: "form_answer", name: "big.pdf", content_type: "application/pdf",
                                        size: 2 * 1024 * 1024, form_id: form.id, field_id: form.docField } });
    expect(status).toBe(413);
  });
});

test.describe("customer on the public link, not signed in", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("uploads a file and submits it as an answer", async ({ page }) => {
    await openBlankPage(page);
    const content = "%PDF-1.4 a customer's file";
    const r = await uploadInBrowser(page, {
      startPath: `/public/forms/${form.token}/uploads`,
      startBody: { field_id: form.docField, name: "receipt.pdf", content_type: "application/pdf", size: content.length },
      completePath: (id) => `/public/forms/${form.token}/uploads/${id}/complete`,
      content, type: "application/pdf",
    });
    expect(r.start, r.error).toBe(201);
    expect(r.put, `anonymous cross-origin PUT passes CORS (${r.error ?? ""})`).toBe(200);
    expect(r.complete).toBe(200);

    const submit = await page.evaluate(async ({ api, token, field, fileId, fileToken }) => (await fetch(
      `${api}/public/forms/${token}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { email: `files-${Date.now()}@example.com`, first_name: "Ann", last_name: "Lee" },
          answers: { [field]: { file_id: fileId, token: fileToken } },
        }),
      })).status,
      { api: API_URL, token: form.token, field: form.docField, fileId: r.file!.id, fileToken: r.token });
    expect(submit).toBe(201);
  });
});
