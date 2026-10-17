import type { FormSection, FormType, SectionTarget } from "@/dto/form/form";
import type { FormField } from "@/dto/form/form-field";

// Branching rules shared by the form builder and the fillers. The path logic
// mirrors the backend (forms/service.py + submissions/service.py) exactly, so
// the pages a respondent sees are the ones the backend keeps and scores.

type Branching = Record<string, SectionTarget>;

// Minimal shapes so both FormRead and the public form fit.
interface PathSection {
  id: number;
  order?: number | null;
  next_section_id?: SectionTarget | null;
}

interface PathField {
  id: number;
  type: string;
  order?: number | null;
  section_id?: number | null;
  branching?: Branching | null;
}

export interface BranchTarget {
  value: SectionTarget;
  label: string;
}

/** An option being edited: its rule is still stored under `from`. */
export interface OptionRename {
  from: string;
  to: string;
}

export function isBranchable(type: string): boolean {
  return type === "single_choice" || type === "boolean";
}

export function hasBranching(field: { branching?: Branching | null }): boolean {
  return !!field.branching && Object.keys(field.branching).length > 0;
}

// Rules are keyed by answer text, so an option named "constructor" or
// "__proto__" must never reach Object.prototype: read and write own keys only.
export function ruleFor(branching: Branching | null | undefined, key: string): SectionTarget | undefined {
  return branching && Object.hasOwn(branching, key) ? branching[key] : undefined;
}

/** Copy of `branching` with the rule for `key` set, or removed when target is null. */
export function setBranchRule(
  branching: Branching | null | undefined,
  key: string,
  target: SectionTarget | null
): Branching | undefined {
  const entries = Object.entries(branching ?? {}).filter(([k]) => k !== key);
  if (target != null) entries.push([key, target]);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

// The backend's canonical section order: by `order`, then by id.
export function orderedSections<S extends PathSection>(sections: S[]): S[] {
  return [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id);
}

// Normalises an answer or a branching key so they compare the way the backend does.
export function branchKey(type: string, value: unknown): string {
  const key = String(value).trim();
  return type === "boolean" ? key.toLowerCase() : key;
}

/** Section to show after `currentId`, or null when the form should be submitted. */
export function nextSectionId(
  sections: PathSection[],
  fields: PathField[],
  currentId: number,
  answers: Record<string, unknown>
): number | null {
  const ordered = orderedSections(sections);
  const i = ordered.findIndex((s) => s.id === currentId);
  if (i < 0) return null;

  let target: SectionTarget | null = null;
  // the section's first branching question (by order, then id) holds its
  // rules, the same one the backend picks
  const bf = fields
    .filter((f) => f.section_id === currentId && hasBranching(f))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id)[0];
  const answer = bf ? answers[String(bf.id)] : undefined;
  if (bf && answer !== undefined && answer !== null) {
    const key = branchKey(bf.type, answer);
    const hit = Object.entries(bf.branching!).find(([k]) => branchKey(bf.type, k) === key);
    if (hit) target = hit[1];
  }
  if (target == null) target = ordered[i].next_section_id ?? null;

  if (target === "end") return null;
  const j = target == null ? -1 : ordered.findIndex((s) => s.id === target);
  if (j > i) return ordered[j].id;
  return ordered[i + 1]?.id ?? null;
}

// Same rule as the backend's _required_missing.
export function isAnswerMissing(value: unknown): boolean {
  return (
    value == null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function firstMissingRequired<F extends { id: number; is_required: boolean }>(
  fields: F[],
  answers: Record<string, unknown>
): F | null {
  return fields.find((f) => f.is_required && isAnswerMissing(answers[String(f.id)])) ?? null;
}

// ── Builder helpers ───────────────────────────────────────────────────────────

// <select> values: "" for no rule, "end", or the section id.
export function encodeTarget(target: SectionTarget | null | undefined): string {
  return target == null ? "" : String(target);
}

export function decodeTarget(value: string): SectionTarget | null {
  if (value === "") return null;
  if (value === "end") return "end";
  return Number(value);
}

export function sectionLabel(section: { title: string }, index: number): string {
  const title = section.title.trim();
  return `Section ${index + 1}${title ? `: ${title}` : ""}`;
}

/** Valid jump targets from a section: every later section, then "End form". */
export function sectionBranchTargets(sections: FormSection[], sectionId: number): BranchTarget[] {
  const ordered = orderedSections(sections);
  const i = ordered.findIndex((s) => s.id === sectionId);
  const later = ordered
    .map((s, idx) => ({ value: s.id as SectionTarget, label: sectionLabel(s, idx) }))
    .slice(i + 1);
  return [...later, { value: "end", label: "End form" }];
}

/** The answers a question can branch on, as branching keys with display labels. */
export function branchAnswers(field: Pick<FormField, "type" | "options">): { key: string; label: string }[] {
  if (field.type === "boolean") {
    return [
      { key: "true", label: "Yes" },
      { key: "false", label: "No" },
    ];
  }
  if (field.type === "single_choice") {
    const unique = Array.from(new Set((field.options ?? []).filter((o) => o !== "")));
    return unique.map((o) => ({ key: o, label: o }));
  }
  return [];
}

/**
 * True when the question has a rule on one of its current answers. Stale
 * keys (an option mid-rename) don't count, so they never block the other
 * questions of the section.
 */
export function hasActiveBranching(field: Pick<FormField, "type" | "options" | "branching">): boolean {
  return branchAnswers(field).some((a) => ruleFor(field.branching, a.key) !== undefined);
}

/**
 * Moves a rule from an option's old text to its new text. Called once the
 * edit is finished (on blur), not per keystroke, so text that briefly matches
 * another option can't capture that option's rule.
 */
export function renameBranchKey(
  branching: Branching | undefined,
  from: string,
  to: string,
  nextOptions: string[]
): Branching | undefined {
  const target = ruleFor(branching, from);
  // no rule, or another option still carries the old text and keeps it
  if (target === undefined || nextOptions.includes(from)) return branching;
  let next = setBranchRule(branching, from, null);
  // an emptied option has no answer to branch on; a duplicate keeps its own rule
  if (to.trim() !== "" && ruleFor(next, to) === undefined) next = setBranchRule(next, to, target);
  return next;
}

/** Drops the rule of a removed option. */
export function dropBranchKey(
  branching: Branching | undefined,
  key: string,
  nextOptions: string[]
): Branching | undefined {
  if (ruleFor(branching, key) === undefined || nextOptions.includes(key)) return branching;
  return setBranchRule(branching, key, null);
}

function sameBranching(a: Branching | undefined, b: Branching | undefined): boolean {
  const ak = Object.keys(a ?? {});
  const bk = Object.keys(b ?? {});
  return ak.length === bk.length && ak.every((k) => ruleFor(b, k) === ruleFor(a, k));
}

/**
 * Clears every rule the backend would reject: branching on exams or flat
 * forms, on non-branchable types, on more than one question per section,
 * keys that aren't answers, and targets that aren't a later section.
 * `changed` tells the caller whether anything was dropped.
 */
export function sanitizeBranching(
  formType: FormType,
  sections: FormSection[],
  fields: FormField[]
): { sections: FormSection[]; fields: FormField[]; changed: boolean } {
  let changed = false;
  const canBranch = formType === "questionnaire" && sections.length > 0;
  const position = new Map(orderedSections(sections).map((s, i) => [s.id, i]));
  const isValidTarget = (sourceId: number, target: SectionTarget) =>
    target === "end" ||
    (position.has(target) && position.get(target)! > position.get(sourceId)!);

  const nextSections = sections.map((s) => {
    const target = s.next_section_id ?? null;
    if (target == null || (canBranch && isValidTarget(s.id, target))) return s;
    changed = true;
    return { ...s, next_section_id: null };
  });

  // the first branching question (by order) of a section keeps its rules
  const claimed = new Set<number>();
  const replaced = new Map<string, Branching | undefined>();
  for (const f of [...fields].sort((a, b) => a.order - b.order)) {
    if (!hasBranching(f)) continue;
    const sid = f.section_id;
    let next: Branching | undefined;
    if (canBranch && isBranchable(f.type) && sid != null && position.has(sid) && !claimed.has(sid)) {
      const allowed = new Set(branchAnswers(f).map((a) => a.key));
      const kept = Object.fromEntries(
        Object.entries(f.branching!)
          .map(([k, target]) => [f.type === "boolean" ? k.trim().toLowerCase() : k, target] as const)
          .filter(([key, target]) => allowed.has(key) && isValidTarget(sid, target))
      );
      if (Object.keys(kept).length > 0) {
        next = kept;
        claimed.add(sid);
      }
    }
    if (!sameBranching(f.branching, next)) {
      replaced.set(f.id, next);
      changed = true;
    }
  }

  const nextFields =
    replaced.size === 0
      ? fields
      : fields.map((f) => (replaced.has(f.id) ? { ...f, branching: replaced.get(f.id) } : f));
  return { sections: nextSections, fields: nextFields, changed };
}
