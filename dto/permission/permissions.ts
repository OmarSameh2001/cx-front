

export const permissionsArray = [
  "customers:read",
  "customers:write",
  "employees:read",
  "employees:write",
  "units:read",
  "units:write",
  "organisations:read",
  "organisations:write",
  "forms:read",
  "forms:write",
  "submissions:read",
  "submissions:write",
  "assignments:read",
  "assignments:write",
  "roles:read",
  "roles:write",
] as const;

export type Permission = typeof permissionsArray[number];
