import type { FieldType } from "./form-field";

export type SubmitterType = "employee" | "customer";
export type FormType = "questionnaire" | "exam";
// Where a branching answer or a section default leads: a section id, or
// "end" to finish the form.
export type SectionTarget = number | "end";

export type MyStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "late"
  | "expired";

export interface FormSection {
  id: number;
  title: string;
  description?: string | null;
  order: number;
  score_weight: number;
  // where to go after this section when no branching answer applies;
  // null/missing means the next section by order
  next_section_id?: SectionTarget | null;
}

export interface FormFieldCreatePayload {
  // on update: existing field id to edit in place; omit for a new field
  id?: number;
  question: string;
  type: FieldType;
  options?: string[] | null;
  right_answer?: string | null;
  order: number;
  help_text?: string | null;
  is_required: boolean;
  score_weight: number;
  section_id?: number | null;
  // answer -> section to jump to; only on single_choice / boolean
  branching?: Record<string, SectionTarget> | null;
}

export interface FormFieldRead extends FormFieldCreatePayload {
  id: number;
}

export interface FormCreatePayload {
  name: string;
  source_type?: string | null;
  type?: FormType;
  description?: string | null;
  submitter_type: SubmitterType[];
  assigned_to_units?: number[] | null;
  time_limit_minutes?: number | null;
  max_attempts?: number | null;
  results_revealed?: boolean;
  fields: FormFieldCreatePayload[];
  sections?: FormSection[] | null;
}

export interface FormSummary {
  id: number;
  name: string;
  type: FormType;
  is_active: boolean;
  is_archived: boolean;
  submitter_type: string[];
  assigned_to_units: number[] | null;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  results_revealed: boolean;
  created_at: string;
  created_by: number | null;
}

export interface AssignedFormSummary extends FormSummary {
  my_status: MyStatus;
  attempts_used: number;
}

export interface FormRead {
  id: number;
  name: string;
  source_type: string | null;
  type: FormType;
  description: string | null;
  submitter_type: SubmitterType[];
  assigned_to_units: number[] | null;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  results_revealed: boolean;
  public_token: string | null;
  is_active: boolean;
  is_archived: boolean;
  created_at: string;
  created_by: number | null;
  fields: FormFieldRead[];
  sections?: FormSection[] | null;
  // a response has been submitted (drafts don't count): only wording can be changed
  has_submissions?: boolean;
}
