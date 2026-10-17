import type { FormSection, FormType } from "@/dto/form/form";
import { validRightAnswer, type FormField } from "@/dto/form/form-field";

// The backend's default section weight; it must stay above 0.
export const DEFAULT_SECTION_WEIGHT = 1;

export function gradingClearedMessage(formType: FormType): string {
  return formType === "exam"
    ? "Correct answers that no longer matched their options were cleared."
    : "Correct answers and scores were removed because questionnaires aren't graded.";
}

/**
 * Exam questions are never required: a timed exam auto-submits whatever was
 * answered when time runs out, and the backend would reject that submit if a
 * required question were blank. Blanks simply score 0.
 */
export function withExamRules<F extends { is_required: boolean }>(formType: FormType, fields: F[]): F[] {
  return formType === "exam" ? fields.map((f) => (f.is_required ? { ...f, is_required: false } : f)) : fields;
}

/**
 * Grading (correct answers, question scores, section weights) only applies to
 * exams. For a questionnaire it is all reset; for an exam only correct answers
 * that no longer match their options are dropped. `changed` tells the caller
 * whether anything was reset.
 */
export function cleanGrading(
  formType: FormType,
  sections: FormSection[],
  fields: FormField[]
): { sections: FormSection[]; fields: FormField[]; changed: boolean } {
  const isExam = formType === "exam";
  let changed = false;

  const nextFields = fields.map((f) => {
    const right_answer = isExam ? validRightAnswer(f.type, f.options, f.right_answer) : undefined;
    const score_weight = isExam ? f.score_weight : 0;
    if (right_answer === f.right_answer && score_weight === f.score_weight) return f;
    changed = true;
    return { ...f, right_answer, score_weight };
  });

  const nextSections = sections.map((s) => {
    if (isExam || s.score_weight === DEFAULT_SECTION_WEIGHT) return s;
    changed = true;
    return { ...s, score_weight: DEFAULT_SECTION_WEIGHT };
  });

  return {
    sections: changed ? nextSections : sections,
    fields: changed ? nextFields : fields,
    changed,
  };
}
