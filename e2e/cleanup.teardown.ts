import { request, test as teardown } from "@playwright/test";

import { API_URL, E2E_PREFIX, USERS } from "./users";

// Runs once, after every test: removes whatever the suite created (anything
// named with E2E_PREFIX), even if a test failed half-way.
teardown("remove E2E data", async () => {
  const api = await request.newContext({ baseURL: API_URL, storageState: USERS.platformAdmin.storage });

  const orgs = await (await api.get("/organisations?limit=200")).json();
  for (const o of orgs.items ?? []) {
    if (o.name.startsWith(E2E_PREFIX)) await api.delete(`/organisations/${o.id}`);
  }

  const roles = await (await api.get("/roles?limit=200")).json();
  for (const r of roles.items ?? []) {
    if (r.name.startsWith(E2E_PREFIX)) await api.delete(`/roles/${r.id}`);
  }

  await api.dispose();
});
