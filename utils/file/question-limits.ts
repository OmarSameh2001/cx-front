// A file question's own limits, kept in its `options` as "key=value" entries
// (the backend reads them in modules/files/service.py: parse_question_limits).
// They can only tighten the organisation's limits, never loosen them.

export interface QuestionFileLimits {
  maxMb?: number;
  types?: string[];
  keepOriginal?: boolean;
}

export const TYPE_PRESETS: { label: string; types: string[] | null }[] = [
  { label: "Any allowed file", types: null },
  { label: "PDF only", types: ["application/pdf"] },
  { label: "Images only", types: ["image/*"] },
  {
    label: "Documents (PDF, Word, Excel)",
    types: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  },
];

export function parseQuestionLimits(options: string[] | undefined | null): QuestionFileLimits {
  const out: QuestionFileLimits = {};
  for (const entry of options ?? []) {
    const i = entry.indexOf("=");
    if (i < 0) continue;
    const key = entry.slice(0, i).trim();
    const value = entry.slice(i + 1).trim();
    if (key === "max_mb" && Number(value) > 0) out.maxMb = Number(value);
    if (key === "types" && value) out.types = value.split(",").map((t) => t.trim()).filter(Boolean);
    if (key === "keep_original") out.keepOriginal = value === "true";
  }
  return out;
}

export function serializeQuestionLimits(limits: QuestionFileLimits, previous?: string[] | null): string[] {
  // keep entries this editor doesn't manage (e.g. image.quality=85)
  const kept = (previous ?? []).filter((e) => {
    const key = e.split("=", 1)[0].trim();
    return e.includes("=") && !["max_mb", "types", "keep_original"].includes(key);
  });
  const out = [...kept];
  if (limits.maxMb && limits.maxMb > 0) out.push(`max_mb=${limits.maxMb}`);
  if (limits.types?.length) out.push(`types=${limits.types.join(",")}`);
  if (limits.keepOriginal) out.push("keep_original=true");
  return out;
}

export function presetIndexFor(types: string[] | undefined): number {
  if (!types?.length) return 0;
  const key = [...types].sort().join(",");
  const i = TYPE_PRESETS.findIndex((p) => p.types && [...p.types].sort().join(",") === key);
  return i < 0 ? 0 : i;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// <input accept> from MIME types (image/* passes through)
export function acceptAttr(types: string[] | undefined): string | undefined {
  return types?.length ? types.join(",") : undefined;
}
