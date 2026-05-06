import type { FieldType } from "./form-field";

export type SubmitterType = "employee" | "customer";

export interface FormFieldCreatePayload {
  question: string;
  type: FieldType;
  options?: string[] | null;
  right_answer?: string | null;
  order: number;
  help_text?: string | null;
  is_required: boolean;
  score_weight: number;
}

export interface FormFieldRead extends FormFieldCreatePayload {
  id: number;
}

export interface FormCreatePayload {
  name: string;
  source_type?: string | null;
  type?: string | null;
  description?: string | null;
  submitter_type: SubmitterType[];
  assigned_to_units?: number[] | null;
  fields: FormFieldCreatePayload[];
}

export interface FormSummary {
  id: number;
  name: string;
  type: string | null;
  is_active: boolean;
  is_archived: boolean;
  submitter_type: string[];
  created_at: string;
  created_by: number | null;
}

export interface FormRead {
  id: number;
  name: string;
  source_type: string | null;
  type: string | null;
  description: string | null;
  submitter_type: SubmitterType[];
  assigned_to_units: number[] | null;
  is_active: boolean;
  is_archived: boolean;
  created_at: string;
  created_by: number | null;
  fields: FormFieldRead[];
}
