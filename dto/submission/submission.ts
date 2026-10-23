import type { FormType, SectionTarget } from "@/dto/form/form";
import type { FieldType } from "@/dto/form/form-field";

export type SubmissionStatus =
  | "in_progress"
  | "submitted"
  | "late"
  | "expired";

export interface SubmissionStartRequest {
  form_id: number;
}

export interface SubmissionDraftUpdate {
  answers: Record<string, unknown>;
}

export interface SubmissionFinalize {
  answers?: Record<string, unknown> | null;
}

export interface SubmissionRead {
  id: number;
  form_id: number;
  status: SubmissionStatus;
  started_at: string;
  expires_at: string | null;
  submitted_at: string | null;
  attempt_number: number;
  results_revealed: boolean;
  score: number | null;
  customer_id: number | null;
  user_id: number | null;
  submitter_name: string | null;
}

export interface SubmissionDetailField {
  id: number;
  order: number;
  type: string;
  is_required: boolean;
  score_weight: number;
  question?: string | null;
  options?: string[] | null;
  right_answer?: string | null;
  help_text?: string | null;
  // on a section the respondent's branching path skipped (finalized only)
  skipped?: boolean;
}

export interface SubmissionDetail extends SubmissionRead {
  answers: Record<string, unknown> | null;
  fields: SubmissionDetailField[];
}

// The form as a respondent sees it, served through their own in-progress
// submission: no correct answers, no grading weights.
export interface RespondentField {
  id: number;
  question: string;
  type: FieldType;
  options?: string[] | null;
  order: number;
  help_text?: string | null;
  is_required: boolean;
  section_id?: number | null;
  branching?: Record<string, SectionTarget> | null;
}

export interface RespondentSection {
  id: number;
  title: string;
  description?: string | null;
  order: number;
  next_section_id?: SectionTarget | null;
}

export interface RespondentForm {
  id: number;
  name: string;
  description?: string | null;
  type: FormType;
  time_limit_minutes?: number | null;
  max_attempts?: number | null;
  fields: RespondentField[];
  sections?: RespondentSection[] | null;
}
