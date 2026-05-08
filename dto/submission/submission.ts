export interface SubmissionCreate {
  form_id: number;
  answers: Record<string, unknown>;
}

export interface SubmissionUpdate {
  answers: Record<string, unknown>;
}

export interface SubmissionRead {
  id: number;
  form_id: number;
  answers: Record<string, unknown> | null;
  score: number | null;
  submitted_at: string;
  customer_id: number | null;
  user_id: number | null;
}
