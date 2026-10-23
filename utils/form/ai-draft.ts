import type { FormField } from "@/dto/form/form-field";
import type {
  FormCreatePayload,
  FormFieldCreatePayload,
  FormSection,
  FormType,
  SubmitterType,
} from "@/dto/form/form";
import { orderedSections } from "./branching";

// Create-page state built from an AI-generated draft. assigned_to_units is
// never set by the generator, so the page keeps its selected units.
export interface AiDraftState {
  name: string;
  description: string;
  formType: FormType;
  submitterType: SubmitterType[];
  timeLimit: string;
  maxAttempts: string;
  resultsRevealed: boolean;
  fields: FormField[];
  sections: FormSection[];
  hasSections: boolean;
  // first id free for sections added after the draft is loaded
  nextSectionId: number;
}

function toDraftField(fld: FormFieldCreatePayload): FormField {
  return {
    id: crypto.randomUUID(),
    question: fld.question,
    type: fld.type,
    options: fld.options ?? undefined,
    right_answer: fld.right_answer ?? undefined,
    order: fld.order,
    help_text: fld.help_text ?? undefined,
    is_required: fld.is_required,
    score_weight: fld.score_weight,
    section_id: fld.section_id ?? null,
    branching: fld.branching ?? undefined,
  };
}

export function aiDraftToState(payload: FormCreatePayload): AiDraftState {
  const sections = payload.sections != null ? orderedSections(payload.sections) : [];
  const maxSectionId = sections.reduce((max, s) => Math.max(max, s.id), 0);
  return {
    name: payload.name,
    description: payload.description ?? "",
    formType: payload.type ?? "questionnaire",
    submitterType: payload.submitter_type,
    timeLimit: payload.time_limit_minutes != null ? String(payload.time_limit_minutes) : "",
    maxAttempts: payload.max_attempts != null ? String(payload.max_attempts) : "",
    resultsRevealed: payload.results_revealed ?? false,
    fields: [...payload.fields].sort((a, b) => a.order - b.order).map(toDraftField),
    sections,
    hasSections: payload.sections != null,
    nextSectionId: maxSectionId + 1,
  };
}
