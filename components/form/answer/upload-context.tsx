"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

// Who is answering, so a file question knows where to upload: a signed-in
// employee answering a form, or an anonymous respondent on a public link.
// Set once around the answer fields instead of threading it through props.
export type UploadContextValue =
  | { kind: "employee"; formId: number }
  | { kind: "public"; token: string };

const UploadContext = createContext<UploadContextValue | null>(null);

export function UploadScope({ value, children }: { value: UploadContextValue; children: ReactNode }) {
  // a stable object, so file questions don't refetch their limits on every render
  const key = value.kind === "public" ? `public:${value.token}` : `employee:${value.formId}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stable = useMemo(() => value, [key]);
  return <UploadContext.Provider value={stable}>{children}</UploadContext.Provider>;
}

export function useUploadContext(): UploadContextValue | null {
  return useContext(UploadContext);
}
