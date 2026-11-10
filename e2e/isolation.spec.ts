import fs from "node:fs";

import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  createIsolationFixture,
  removeIsolationFixture,
  signedIn,
  type IsoFixture,
} from "./isolation-fixture";
import { USERS } from "./users";

// T0.6.1 — organisation isolation, against the real API and database.
// Org A's admin creates one of everything; org B's admin (every permission in
// B) then tries every mounted route on A's data. Each attempt must be refused
// with 403 or 404, B's lists must not contain A's rows, and afterwards A's
// data must be unchanged. The attack tests only record what happened, so one
// run covers every route; the last test fails if anything was let through.
// The full list is written to test-results/isolation-report.json.

test.describe.configure({ mode: "serial" });
test.setTimeout(5 * 60_000);

const REFUSED = [403, 404];
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

let fx: IsoFixture;
let A: APIRequestContext;
let B: APIRequestContext;
let platform: APIRequestContext;
// A's resources, by kind
const a: Record<string, number | string> = {};
type Result = { check: string; status: number; ok: boolean; note?: string };
const results: Result[] = [];

function record(check: string, status: number, ok: boolean, note?: string) {
  results.push({ check, status, ok, note });
}

async function json(res: { json(): Promise<unknown>; text(): Promise<string> }) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** Create something as A and return its id; fails the setup if A can't. */
async function asA(method: "post" | "put", path: string, data: object, key: string, idField = "id") {
  const res = await A[method](path, { data });
  const body = (await json(res)) as Record<string, unknown> | null;
  if (![200, 201].includes(res.status()) || !body) {
    throw new Error(`setup: A ${method.toUpperCase()} ${path} → ${res.status()} ${JSON.stringify(body)}`);
  }
  a[key] = body[idField] as number | string;
  return body;
}

/** B tries one request on A's data: anything but 403/404 is a finding. */
async function attack(method: string, path: string, data?: object) {
  const res = await B.fetch(path, { method, data });
  const status = res.status();
  const note = REFUSED.includes(status) ? undefined : (await res.text()).slice(0, 160);
  record(`${method} ${path}`, status, REFUSED.includes(status), note);
}

/** B lists something: refused, or a 200 that contains none of A's ids. */
async function listing(path: string, aIds: (number | string)[]) {
  const res = await B.get(path);
  const status = res.status();
  if (REFUSED.includes(status)) return record(`GET ${path} (list)`, status, true);
  const body = (await json(res)) as { items?: { id: unknown }[] } | { id: unknown }[] | null;
  const items = Array.isArray(body) ? body : body?.items ?? [];
  const ids = items.map((i) => i.id);
  const leaked = aIds.filter((id) => ids.includes(id));
  record(
    `GET ${path} (list)`,
    status,
    status === 200 && leaked.length === 0,
    leaked.length ? `contains A's ${leaked.join(", ")}` : status === 200 ? undefined : (await res.text()).slice(0, 160),
  );
}

test.beforeAll(async () => {
  fx = createIsolationFixture();
  A = await signedIn(fx.A.email);
  B = await signedIn(fx.B.email);
  const { request } = await import("@playwright/test");
  platform = await request.newContext({
    baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
    storageState: USERS.platformAdmin.storage,
  });

  // ── A's data: one of everything ──────────────────────────────────────────
  const roles = (await (await A.get("/roles")).json()).items as { id: number; name: string }[];
  a.role_manager = roles.find((r) => r.name === "manager")!.id;
  await asA("post", "/roles", { name: "E2E iso role" }, "role");
  await asA("post", "/units", { name: "A child", organisation_id: fx.A.org_id, parent_unit_id: fx.A.unit_id }, "unit");
  await asA("post", "/employees", {
    first_name: "Ann", last_name: "A", username: `e2e_iso_a_emp_${Date.now()}`,
    email: `iso-a-emp-${Date.now()}@example.com`, password: "secret123",
    unit_id: fx.A.unit_id, role_id: a.role_manager,
  }, "employee");

  const form = await asA("post", "/forms", {
    name: "E2E iso form", type: "questionnaire", submitter_type: ["employee", "customer"],
    fields: [{ question: "Q", type: "single_choice", options: ["Yes", "No"], is_required: true, order: 0 }],
  }, "form");
  await A.post(`/forms/${form.id}/activate`);
  a.form_token = (await (await A.get(`/forms/${form.id}`)).json()).public_token;
  a.field = (form.fields as { id: number }[])[0].id;

  // a submitted customer response, and A's own open employee draft
  const pub = await A.post(`/public/forms/${a.form_token}/submit`, {
    data: { customer: { email: "iso-customer@example.com", first_name: "Cus", last_name: "Tomer" }, answers: { [a.field]: "Yes" } },
  });
  if (pub.status() !== 201) throw new Error(`setup: public submit → ${pub.status()} ${await pub.text()}`);
  a.submission_customer = (await pub.json()).submission_id;
  await asA("post", "/submissions/start", { form_id: form.id }, "submission_draft");
  a.customer = (await (await A.get(`/submissions/${a.submission_customer}`)).json()).customer_id;

  await asA("post", "/assignments", { user_id: a.employee, unit_id: a.unit, description: "E2E iso" }, "assignment");

  // A's tenant (platform admin only) and its monitoring rows
  const tenant = await platform.post("/tenants", { data: { name: "E2E iso tenant", email: "t@example.com", organisation_id: fx.A.org_id } });
  if (tenant.status() !== 201) throw new Error(`setup: tenant → ${tenant.status()} ${await tenant.text()}`);
  a.tenant = (await tenant.json()).id;
  await asA("post", "/keywords", { phrase: "e2e-iso", tenant_id: a.tenant }, "keyword");
  await asA("post", "/mentions", { tenant_id: a.tenant, content_text: "e2e iso" }, "mention");
  await asA("post", "/notification-rules", { tenant_id: a.tenant, source_module: "mentions", rule_type: "spike" }, "rule");
  await asA("post", "/notification-deliveries", {
    tenant_id: a.tenant, notification_rule_id: a.rule, source_module: "mentions",
    channel: "email", recipient: "x@example.com", status: "sent",
  }, "delivery");
});

test.afterAll(async () => {
  fs.mkdirSync("test-results", { recursive: true });
  fs.writeFileSync("test-results/isolation-report.json", JSON.stringify({ fixture: fx, a, results }, null, 2));
  await Promise.all([A?.dispose(), B?.dispose(), platform?.dispose()]);
  if (!process.env.E2E_KEEP_ISOLATION) removeIsolationFixture();
});

// ── lists ────────────────────────────────────────────────────────────────────

test("B's lists and lookups contain none of A's rows", async () => {
  await listing("/employees", [fx.A.employee_id, a.employee]);
  await listing("/forms", [a.form]);
  await listing("/forms/assigned-to-me", [a.form]);
  await listing("/submissions", [a.submission_customer, a.submission_draft]);
  await listing(`/submissions?form_id=${a.form}`, [a.submission_customer, a.submission_draft]);
  await listing("/submissions/mine", [a.submission_customer, a.submission_draft]);
  await listing("/assignments", [a.assignment]);
  await listing(`/assignments?user_id=${a.employee}`, [a.assignment]);
  await listing("/roles", [a.role, a.role_manager]);
  await listing("/organisations", [fx.A.org_id]);
  await listing(`/units?organisation_id=${fx.A.org_id}`, [fx.A.unit_id, a.unit]);
  await listing("/lookups/employees", [fx.A.employee_id, a.employee]);
  await listing("/lookups/customers", [a.customer]);
  await listing("/lookups/units", [fx.A.unit_id, a.unit]);
  await listing("/lookups/forms", [a.form]);
  await listing("/lookups/roles", [a.role, a.role_manager]);
  await listing(`/keywords?tenant_id=${a.tenant}`, [a.keyword]);
  await listing(`/mentions?tenant_id=${a.tenant}`, [a.mention]);
  await listing(`/notification-rules?tenant_id=${a.tenant}`, [a.rule]);
  await listing(`/notification-deliveries?tenant_id=${a.tenant}`, [a.delivery]);
  await listing(`/platform-configs?tenant_id=${a.tenant}`, []);
  await listing("/tenants", [a.tenant]);
});

// ── reads and writes on A's rows ─────────────────────────────────────────────

test("B cannot read or change A's employees, units, roles and organisation", async () => {
  const e = `/employees/${a.employee}`;
  await attack("GET", e);
  await attack("PATCH", e, { first_name: "Hacked" });
  const u = `/units/${a.unit}`;
  await attack("GET", `${u}?organisation_id=${fx.A.org_id}`);
  await attack("GET", `${u}?organisation_id=${fx.B.org_id}`);
  await attack("PATCH", `${u}?organisation_id=${fx.A.org_id}`, { name: "Hacked" });
  const r = `/roles/${a.role}`;
  await attack("GET", r);
  await attack("PATCH", r, { name: "Hacked" });
  await attack("PUT", `${r}/permissions`, { permission_ids: [] });
  await attack("POST", `${r}/permissions`, { permission_ids: [1] });
  await attack("GET", `/organisations/${fx.A.org_id}`);
  await attack("PATCH", `/organisations/${fx.A.org_id}`, { name: "Hacked" });
});

test("B cannot read or change A's forms", async () => {
  const f = `/forms/${a.form}`;
  await attack("GET", f);
  await attack("PATCH", f, { name: "Hacked" });
  await attack("POST", `${f}/duplicate`);
  await attack("POST", `${f}/deactivate`);
  await attack("POST", `${f}/activate`);
  await attack("POST", `${f}/reveal-results`);
  await attack("POST", `${f}/public-token`);
});

test("B cannot read or change A's submissions", async () => {
  for (const id of [a.submission_customer, a.submission_draft]) {
    await attack("GET", `/submissions/${id}`);
    await attack("GET", `/submissions/${id}/detail`);
    await attack("GET", `/submissions/${id}/form`);
  }
  await attack("PATCH", `/submissions/${a.submission_draft}/draft`, { answers: {} });
  await attack("POST", `/submissions/${a.submission_customer}/reveal`);
});

test("B cannot read or change A's assignments", async () => {
  await attack("GET", `/assignments/${a.assignment}`);
  await attack("PATCH", `/assignments/${a.assignment}`, { description: "Hacked" });
});

test("B cannot read or change A's tenant data", async () => {
  await attack("GET", `/tenants/${a.tenant}`);
  await attack("PATCH", `/tenants/${a.tenant}`, { name: "Hacked" });
  for (const [kind, id] of [["keywords", a.keyword], ["mentions", a.mention],
    ["notification-rules", a.rule], ["notification-deliveries", a.delivery]] as const) {
    await attack("GET", `/${kind}/${id}`);
    await attack("PATCH", `/${kind}/${id}`, { is_active: false });
  }
  await attack("GET", `/platform-configs/${ZERO_UUID}`);
});

// ── creating things inside A ─────────────────────────────────────────────────

test("B cannot create things inside A or tie its own rows to A's", async () => {
  const stamp = Date.now();
  await attack("POST", "/units", { name: "B in A", organisation_id: fx.A.org_id });
  await attack("POST", "/employees", {
    first_name: "B", last_name: "InA", username: `e2e_iso_b_${stamp}`, email: `iso-b-${stamp}@example.com`,
    password: "secret123", unit_id: fx.B.unit_id, role_id: a.role_manager,
  });
  await attack("POST", "/employees", {
    first_name: "B", last_name: "Mgr", username: `e2e_iso_b2_${stamp}`, email: `iso-b2-${stamp}@example.com`,
    password: "secret123", unit_id: fx.B.unit_id, manager_id: a.employee,
  });
  await attack("PATCH", `/employees/${fx.B.employee_id}`, { manager_id: a.employee });
  await attack("POST", "/assignments", { user_id: a.employee, unit_id: a.unit });
  await attack("POST", "/assignments", { user_id: fx.B.employee_id, unit_id: a.unit });
  await attack("POST", "/forms", {
    name: "B form on A's units", type: "questionnaire", submitter_type: ["employee"],
    assigned_to_units: [a.unit], fields: [{ question: "Q", type: "text", order: 0 }],
  });
  await attack("POST", "/submissions/start", { form_id: a.form });
  await attack("POST", "/keywords", { phrase: "b-in-a", tenant_id: a.tenant });
  await attack("POST", "/mentions", { tenant_id: a.tenant, content_text: "b in a" });
  await attack("POST", "/notification-rules", { tenant_id: a.tenant, source_module: "x", rule_type: "y" });
  await attack("POST", "/platform-configs", { tenant_id: a.tenant, platform: "x" });
});

// ── deletes last, then A checks nothing changed ──────────────────────────────

test("B cannot delete A's rows", async () => {
  await attack("DELETE", `/submissions/${a.submission_draft}`);
  await attack("DELETE", `/roles/${a.role}/permissions/1`);
  await attack("DELETE", `/forms/${a.form}/public-token`);
  for (const [kind, id] of [["notification-deliveries", a.delivery], ["notification-rules", a.rule],
    ["mentions", a.mention], ["keywords", a.keyword], ["assignments", a.assignment]] as const) {
    await attack("DELETE", `/${kind}/${id}`);
  }
  await attack("DELETE", `/forms/${a.form}`);
  await attack("DELETE", `/employees/${a.employee}`);
  await attack("DELETE", `/units/${a.unit}?organisation_id=${fx.A.org_id}`);
  await attack("DELETE", `/roles/${a.role}`);
  await attack("DELETE", `/tenants/${a.tenant}`);
  await attack("DELETE", `/organisations/${fx.A.org_id}`);
});

test("A's data is unchanged afterwards", async () => {
  const checks: [string, string, (b: Record<string, unknown>) => boolean][] = [
    ["employee", `/employees/${a.employee}`, (b) => b.first_name === "Ann"],
    ["unit", `/units/${a.unit}?organisation_id=${fx.A.org_id}`, (b) => b.name === "A child"],
    ["role", `/roles/${a.role}`, (b) => b.name === "E2E iso role"],
    ["form", `/forms/${a.form}`, (b) => b.name === "E2E iso form" && b.is_active === true && b.public_token === a.form_token],
    ["draft submission", `/submissions/${a.submission_draft}`, (b) => b.status === "in_progress"],
    ["assignment", `/assignments/${a.assignment}`, (b) => b.description === "E2E iso"],
    ["keyword", `/keywords/${a.keyword}`, (b) => b.is_active !== false],
    ["mention", `/mentions/${a.mention}`, () => true],
    ["notification rule", `/notification-rules/${a.rule}`, (b) => b.is_active !== false],
    ["organisation", `/organisations/${fx.A.org_id}`, (b) => b.name === "E2E Isolation Org A"],
  ];
  for (const [name, path, intact] of checks) {
    const res = await A.get(path);
    const body = ((await json(res)) ?? {}) as Record<string, unknown>;
    record(`A still has its ${name}`, res.status(), res.status() === 200 && intact(body),
      res.status() === 200 && !intact(body) ? "changed by B" : undefined);
  }
});

// ── verdict ──────────────────────────────────────────────────────────────────

test("no request from B reached A's data", () => {
  const findings = results.filter((r) => !r.ok).map((r) => `${r.status} ${r.check}${r.note ? ` — ${r.note}` : ""}`);
  expect(results.length, "checks ran").toBeGreaterThanOrEqual(97);
  expect(findings, `${findings.length} of ${results.length} checks failed`).toEqual([]);
});
