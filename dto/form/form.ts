import type { FieldType } from "./form-field";

export type SubmitterType = "employee" | "customer";
export type FormType = "questionnaire" | "exam";
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
}

export interface FormFieldCreatePayload {
  question: string;
  type: FieldType;
  options?: string[] | null;
  right_answer?: string | null;
  order: number;
  help_text?: string | null;
  is_required: boolean;
  score_weight: number;
  section_id?: number | null;
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
}
