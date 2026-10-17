import type { SectionTarget } from "./form";

export type FieldType =
  | "single_choice"
  | "multi_choice"
  | "boolean"
  | "text"
  | "date"
  | "phone_number"
  | "email"
  | "file"
  | "scale";

export interface FormField {
  id: string;
  // id of the saved field on the backend; absent until the field is saved
  serverId?: number;
  question: string;
  type: FieldType;
  options?: string[];
  right_answer?: string;
  order: number;
  help_text?: string;
  is_required: boolean;
  score_weight: number;
  section_id?: number | null;
  branching?: Record<string, SectionTarget>;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  single_choice: "Single choice",
  multi_choice: "Multiple choice",
  boolean: "Yes / No",
  text: "Short answer",
  date: "Date",
  phone_number: "Phone number",
  email: "Email",
  file: "File upload",
  scale: "Linear scale",
};

export function createField(order: number, type: FieldType = "single_choice"): FormField {
  const base: FormField = {
    id: crypto.randomUUID(),
    question: "",
    type,
    order,
    is_required: false,
    score_weight: 0,
  };
  return withDefaultsForType(base, type);
}

// The backend rejects choice questions with fewer than two options.
export const MIN_CHOICE_OPTIONS = 2;

export function isChoiceType(type: FieldType): boolean {
  return type === "single_choice" || type === "multi_choice";
}

export function hasTooFewOptions(field: Pick<FormField, "type" | "options">): boolean {
  return isChoiceType(field.type) && (field.options?.length ?? 0) < MIN_CHOICE_OPTIONS;
}

function withMinOptions(options: string[] | undefined): string[] {
  const next = [...(options ?? [])];
  while (next.length < MIN_CHOICE_OPTIONS) next.push(`Option ${next.length + 1}`);
  return next;
}

function answerParts(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * The correct answer if the backend would still accept it for this type and
 * these options, otherwise undefined. Choice answers are stored as option text
 * (a comma-joined list for multiple choice), so option edits can invalidate
 * them; a text question's is a free-text reference answer.
 */
export function validRightAnswer(
  type: FieldType,
  options: string[] | undefined,
  value: string | null | undefined
): string | undefined {
  if (!value) return undefined;
  const opts = options ?? [];
  switch (type) {
    case "single_choice":
      return opts.includes(value) ? value : undefined;
    case "multi_choice": {
      const kept = Array.from(new Set(answerParts(value).filter((p) => opts.includes(p))));
      return kept.length > 0 ? kept.join(",") : undefined;
    }
    case "boolean":
      return ["true", "false"].includes(value.trim().toLowerCase()) ? value : undefined;
    case "text":
      return value.trim() ? value : undefined;
    default:
      return undefined;
  }
}

/** Correct answer after option text `from` became `to`; empty `to` drops it. */
export function renameInRightAnswer(
  field: Pick<FormField, "type" | "right_answer">,
  from: string,
  to: string,
  nextOptions: string[]
): string | undefined {
  const value = field.right_answer;
  // another option still carries the old text, so the answer still points at it
  if (!value || nextOptions.includes(from)) return validRightAnswer(field.type, nextOptions, value);
  const renamed =
    field.type === "multi_choice"
      ? answerParts(value)
          .map((p) => (p === from.trim() ? to.trim() : p))
          .filter(Boolean)
          .join(",")
      : value === from
        ? to
        : value;
  return validRightAnswer(field.type, nextOptions, renamed);
}

export function withDefaultsForType(field: FormField, type: FieldType): FormField {
  let options: string[] | undefined;
  switch (type) {
    case "single_choice":
    case "multi_choice":
      options = withMinOptions(field.options);
      break;
    case "scale":
      options = field.options && field.options.length === 2 ? field.options : ["", ""];
      break;
    case "boolean":
      options = ["Yes", "No"];
      break;
    default:
      options = undefined;
  }
  // keep the correct answer only where it still fits the new type and options
  return { ...field, type, options, right_answer: validRightAnswer(type, options, field.right_answer) };
}
