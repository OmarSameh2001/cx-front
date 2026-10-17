// Unsent progress on a public form, kept per browser tab so a refresh doesn't
// lose it. sessionStorage (not localStorage) because it holds the
// respondent's personal details: it's gone when the tab closes, and it is
// cleared once the form is submitted. Storage can be missing or throw
// (private mode, blocked site data), so every access is guarded and a failure
// just means nothing is restored.

export interface PublicFormProgress {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  answers: Record<string, unknown>;
  // visited section ids, so the respondent lands back on their page
  path: number[];
}

export function publicProgressKey(token: string): string {
  return `public-form-progress:${token}`;
}

const text = (v: unknown) => (typeof v === "string" ? v : "");

export function readPublicProgress(key: string): PublicFormProgress | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object") return null;
    return {
      email: text(v.email),
      firstName: text(v.firstName),
      lastName: text(v.lastName),
      phone: text(v.phone),
      answers:
        v.answers && typeof v.answers === "object" && !Array.isArray(v.answers)
          ? v.answers
          : {},
      path: Array.isArray(v.path) ? v.path.filter(Number.isInteger) : [],
    };
  } catch {
    return null;
  }
}

export function writePublicProgress(key: string, progress: PublicFormProgress): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(progress));
  } catch {
    // storage unavailable or full: progress just isn't kept
  }
}

export function clearPublicProgress(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // nothing to clear
  }
}
