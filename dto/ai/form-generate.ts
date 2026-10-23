import type { FormType, SubmitterType } from "../form/form";

export const AI_PROMPT_MIN_LENGTH = 3;
export const AI_PROMPT_MAX_LENGTH = 4000;
export const AI_MAX_QUESTIONS_LIMIT = 50;
export const AI_DEFAULT_MAX_QUESTIONS = 15;

// Body of POST /ai/forms/generate; the response is a FormCreatePayload.
export interface FormGenerateRequest {
  // 3–4000 characters
  prompt: string;
  type?: FormType;
  submitter_type?: SubmitterType[];
  language?: string;
  // 1–50, backend default 15
  max_questions?: number;
}
