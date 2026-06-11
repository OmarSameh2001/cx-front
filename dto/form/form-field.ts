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
  question: string;
  type: FieldType;
  options?: string[];
  right_answer?: string;
  order: number;
  help_text?: string;
  is_required: boolean;
  score_weight: number;
  section_id?: number | null;
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

export function withDefaultsForType(field: FormField, type: FieldType): FormField {
  switch (type) {
    case "single_choice":
    case "multi_choice":
      return {
        ...field,
        type,
        options: field.options && field.options.length > 0 ? field.options : ["Option 1"],
      };
    case "scale":
      return {
        ...field,
        type,
        options: field.options && field.options.length === 2 ? field.options : ["", ""],
      };
    case "boolean":
      return { ...field, type, options: ["Yes", "No"] };
    default:
      return { ...field, type, options: undefined };
  }
}
