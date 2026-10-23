// Who may open a form's editor or its submissions. Mirrors the backend's
// modules/forms/access.py so buttons are only offered where they lead
// somewhere; the backend still enforces every rule.

export interface Viewer {
  userId: number | null | undefined;
  isAdmin: boolean;
  permissions: Record<string, true>;
}

const MANAGE = ["forms:update", "forms:manage"];
const REVIEW = ["submissions:read", "submissions:view"];

function holds(viewer: Viewer, wanted: string[]): boolean {
  return viewer.isAdmin || wanted.some((p) => !!viewer.permissions[p]);
}

const isCreator = (form: { created_by: number | null }, viewer: Viewer) =>
  form.created_by != null && form.created_by === viewer.userId;

/** Review the form's submissions. */
export function canReviewForm(form: { created_by: number | null }, viewer: Viewer): boolean {
  return isCreator(form, viewer) || holds(viewer, REVIEW);
}

/** Open the form itself (the editor, read-only unless it's yours). */
export function canViewForm(form: { created_by: number | null }, viewer: Viewer): boolean {
  return isCreator(form, viewer) || holds(viewer, [...MANAGE, ...REVIEW, "forms:read"]);
}
