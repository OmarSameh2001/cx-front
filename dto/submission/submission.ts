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
}

export interface SubmissionDetail extends SubmissionRead {
  answers: Record<string, unknown> | null;
  fields: SubmissionDetailField[];
}
