export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Everything tests create is named with this, so cleanup.teardown.ts can find it.
export const E2E_PREFIX = "E2E ";
export const uniqueName = () => `${E2E_PREFIX}${Date.now()}-${Math.floor(Math.random() * 1e4)}`;

// Accounts created by `python scripts.py db:seed` in cx-api.
export const PASSWORD = "Password123!";

export const USERS = {
  // Acme's organisation admin (system role), not a platform admin.
  orgAdmin: { email: "admin@acme.com", storage: ".auth/org-admin.json" },
  // Acme's organisation admin and a platform admin.
  platformAdmin: { email: "platform@acme.com", storage: ".auth/platform-admin.json" },
} as const;
