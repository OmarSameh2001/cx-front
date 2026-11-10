import { execFileSync } from "node:child_process";
import path from "node:path";

import { request, type APIRequestContext } from "@playwright/test";

import { API_URL, PASSWORD } from "./users";

// Wraps `python scripts.py e2e:isolation` in cx-api: two throwaway
// organisations A and B, each with an org admin holding every permission.
const API_DIR = path.resolve(__dirname, "../../cx-api");
const PYTHON =
  process.env.E2E_API_PYTHON ??
  (process.platform === "win32" ? "venv\\Scripts\\python.exe" : "venv/bin/python");

export type IsoOrg = { org_id: number; unit_id: number; employee_id: number; email: string };
export type IsoFixture = { A: IsoOrg; B: IsoOrg };

function runFixture(args: string[]): string {
  return execFileSync(PYTHON, ["scripts.py", "e2e:isolation", ...args], {
    cwd: API_DIR,
    encoding: "utf8",
    timeout: 120_000,
  });
}

export function createIsolationFixture(): IsoFixture {
  const out = runFixture([]);
  const line = out.trim().split(/\r?\n/).pop() ?? "";
  return JSON.parse(line) as IsoFixture;
}

export function removeIsolationFixture(): void {
  runFixture(["--remove"]);
}

/** An API client signed in as `email` (cookies kept on the context). */
export async function signedIn(email: string): Promise<APIRequestContext> {
  const api = await request.newContext({ baseURL: API_URL });
  const res = await api.post("/auth/employee/login", { data: { email, password: PASSWORD } });
  if (res.status() !== 200) throw new Error(`login ${email}: ${res.status()} ${await res.text()}`);
  return api;
}
