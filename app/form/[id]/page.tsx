"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  AlertCircle,
  ArrowLeft,
  ClipboardList,
  Copy,
  LayoutList,
  Link2,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import FieldCard from "@/components/form/field-card";
import SectionCard from "@/components/form/section-card";
import { UnitsMultiSelect } from "@/components/units-multi-select";
import {
  createField,
  hasTooFewOptions,
  type FormField,
} from "@/dto/form/form-field";
import type {
  FormCreatePayload,
  FormFieldCreatePayload,
  FormFieldRead,
  FormRead,
  FormSection,
  FormType,
  SubmitterType,
} from "@/dto/form/form";
import type { LookupResult } from "@/dto/lookup/lookup";
import { FormService } from "@/services/form/form";
import { HttpError } from "@/services/http";
import { LookupService } from "@/services/lookup/lookup";
import {
  showConfirmToast,
  showErrorToast,
  showInfoToast,
  showSuccessToast,
  showWarningToast,
} from "@/utils/toaster/toaster";
import {
  hasBranching,
  orderedSections,
  sanitizeBranching,
  sectionBranchTargets,
} from "@/utils/form/branching";
import { cleanGrading, gradingClearedMessage, withExamRules } from "@/utils/form/grading";
import { useAuth } from "@/app/_providers/auth-provider";

const formService = new FormService();
const lookupService = new LookupService();

const SUBMITTER_OPTIONS: { value: SubmitterType; label: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "customer", label: "Customer" },
];

function toEditorField(fld: FormFieldRead, editorId?: string): FormField {
  return {
    id: editorId ?? String(fld.id),
    serverId: fld.id,
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

function toFieldPayload(f: FormField): FormFieldCreatePayload {
  return {
    // existing fields are updated in place; fields without an id are created
    id: f.serverId,
    question: f.question,
    type: f.type,
    options: f.options ?? null,
    right_answer: f.right_answer ?? null,
    order: f.order,
    help_text: f.help_text ?? null,
    is_required: f.is_required,
    score_weight: f.score_weight,
    section_id: f.section_id ?? null,
    branching: hasBranching(f) ? f.branching : null,
  };
}

function toSectionPayload(s: FormSection): FormSection {
  return { ...s, next_section_id: s.next_section_id ?? null };
}

// Saved field id -> the editor id it had before the save, so a save doesn't
// remount the cards (the open one stays open). New fields are created in the
// order they were sent, so their ascending ids line up with that order.
function editorIdsAfterSave(sent: FormField[], saved: FormRead): Map<number, string> {
  const ids = new Map<number, string>();
  for (const f of sent) if (f.serverId != null) ids.set(f.serverId, f.id);
  const unsaved = sent.filter((f) => f.serverId == null);
  const created = saved.fields.filter((f) => !ids.has(f.id)).sort((a, b) => a.id - b.id);
  if (created.length === unsaved.length) {
    created.forEach((f, i) => ids.set(f.id, unsaved[i].id));
  }
  return ids;
}

// When the form has responses the backend only accepts wording changes, so
// every structural attribute is taken from the saved form and only the
// question, help text, required flag and order come from the editor.
function lockedFields(saved: FormRead, fields: FormField[]): FormFieldRead[] {
  const edited = new Map(
    fields.filter((f) => f.serverId != null).map((f) => [f.serverId!, f])
  );
  // Adding or deleting a question renumbers its neighbours, so where the
  // editor's questions differ from the saved ones (edits being undone after a
  // 409) the editor's order would shuffle the section: keep the saved order.
  const sectionKey = (sectionId: number | null | undefined) => String(sectionId ?? "");
  const questionsBySection = (pairs: [string, string][]) => {
    const groups = new Map<string, string[]>();
    for (const [key, id] of pairs) groups.set(key, [...(groups.get(key) ?? []), id]);
    return new Map([...groups].map(([key, ids]) => [key, ids.sort().join()]));
  };
  const savedQuestions = questionsBySection(
    saved.fields.map((f) => [sectionKey(f.section_id), String(f.id)])
  );
  const editedQuestions = questionsBySection(
    fields.map((f) => [sectionKey(f.section_id), String(f.serverId ?? f.id)])
  );
  const sameQuestions = (sectionId: number | null | undefined) =>
    savedQuestions.get(sectionKey(sectionId)) === editedQuestions.get(sectionKey(sectionId));
  return saved.fields.map((sf) => {
    const lf = edited.get(sf.id);
    return {
      id: sf.id,
      question: lf?.question ?? sf.question,
      type: sf.type,
      options: sf.options ?? null,
      right_answer: sf.right_answer ?? null,
      order: lf && sameQuestions(sf.section_id) ? lf.order : sf.order,
      help_text: (lf ? lf.help_text : sf.help_text) ?? null,
      is_required: lf?.is_required ?? sf.is_required,
      score_weight: sf.score_weight,
      section_id: sf.section_id ?? null,
      branching: sf.branching ?? null,
    };
  });
}

function lockedSections(saved: FormRead, sections: FormSection[]): FormSection[] | null {
  if (!saved.sections || saved.sections.length === 0) return null;
  const edited = new Map(sections.map((s) => [s.id, s]));
  return saved.sections.map((ss) => {
    const ls = edited.get(ss.id);
    return {
      ...ss,
      title: ls?.title ?? ss.title,
      description: (ls ? ls.description : ss.description) ?? null,
    };
  });
}

export default function FormEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, permissions } = useAuth();
  const nextSectionId = useRef(1);

  const [form, setForm] = useState<FormRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // editable fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitterType, setSubmitterType] = useState<SubmitterType[]>(["employee"]);
  const [formType, setFormType] = useState<FormType>("questionnaire");
  const [timeLimit, setTimeLimit] = useState<string>("");
  const [maxAttempts, setMaxAttempts] = useState<string>("");
  const [resultsRevealed, setResultsRevealed] = useState<boolean>(false);
  const [selectedUnits, setSelectedUnits] = useState<LookupResult[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scoringMode, setScoringMode] = useState<"weight" | "percentage">("weight");
  // the form has responses: only wording can change
  const [structureLocked, setStructureLocked] = useState(false);

  const hasUnits = selectedUnits.length > 0;
  const hasSections = sections.length > 0;
  const totalSectionWeight = sections.reduce((s, sec) => s + sec.score_weight, 0);

  // Replaces the editor's sections and fields with a saved form's, so fields
  // carry their server ids into the next save. The lock arrives in the same
  // response, so the editor is never editable before it is known.
  const loadStructure = useCallback((f: FormRead, editorIds?: Map<number, string>) => {
    // same order the backend uses, so section numbers and "later" match it
    const loadedSections = orderedSections(f.sections ?? []);
    setSections(loadedSections);
    if (loadedSections.length > 0) {
      const maxId = Math.max(...loadedSections.map((s) => s.id));
      nextSectionId.current = maxId + 1;
    }
    setFields(f.fields.map((fld) => toEditorField(fld, editorIds?.get(fld.id))));
    setStructureLocked(!!f.has_submissions);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    formService
      .getById(Number(id))
      .then(async (f) => {
        if (cancelled) return;
        setForm(f);
        setName(f.name);
        setDescription(f.description ?? "");
        setSubmitterType(f.submitter_type);
        setFormType(f.type);
        setTimeLimit(f.time_limit_minutes != null ? String(f.time_limit_minutes) : "");
        setMaxAttempts(f.max_attempts != null ? String(f.max_attempts) : "");
        setResultsRevealed(f.results_revealed);
        loadStructure(f);

        if (f.assigned_to_units && f.assigned_to_units.length > 0) {
          try {
            const allUnits = await lookupService.units();
            if (!cancelled) {
              const unitSet = new Set(f.assigned_to_units);
              setSelectedUnits(allUnits.filter((u) => unitSet.has(u.id)));
            }
          } catch {
            // non-critical
          }
        }
      })
      .catch((e) =>
        showErrorToast(e instanceof Error ? e.message : "Could not load form")
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, loadStructure]);

  useEffect(() => {
    if (hasUnits) {
      setSubmitterType((prev) =>
        prev.length === 1 && prev[0] === "employee" ? prev : ["employee"]
      );
    }
  }, [hasUnits]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Flat-mode field operations ──────────────────────────────────────────────

  const updateField = (fieldId: string, patch: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, ...patch } : f))
    );
  };

  const deleteField = (fieldId: string) => {
    setFields((prev) =>
      prev.filter((f) => f.id !== fieldId).map((f, i) => ({ ...f, order: i }))
    );
  };

  const duplicateField = (fieldId: string) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === fieldId);
      if (idx < 0) return prev;
      const clone: FormField = {
        ...prev[idx],
        id: crypto.randomUUID(),
        // the copy is a new field on save
        serverId: undefined,
        options: prev[idx].options ? [...prev[idx].options!] : undefined,
        // a section can only have one branching question
        branching: undefined,
      };
      const next = [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)];
      return next.map((f, i) => ({ ...f, order: i }));
    });
  };

  const addField = () => {
    setFields((prev) => {
      const next = [...prev, createField(prev.length)];
      setActiveId(next[next.length - 1].id);
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFields((prev) => {
      const oldIndex = prev.findIndex((f) => f.id === active.id);
      const newIndex = prev.findIndex((f) => f.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex).map((f, i) => ({
        ...f,
        order: i,
      }));
    });
  };

  // ── Section operations ──────────────────────────────────────────────────────

  // Commits a structural section change, clearing branching targets that were
  // removed or no longer come later.
  const applySections = (
    nextSections: FormSection[],
    nextFields: FormField[],
    clearedMessage: string
  ) => {
    const cleaned = sanitizeBranching(formType, nextSections, nextFields);
    setSections(cleaned.sections);
    setFields(cleaned.fields);
    if (cleaned.changed) showInfoToast(clearedMessage);
  };

  const addSection = () => {
    const newId = nextSectionId.current++;
    const newSection: FormSection = {
      id: newId,
      title: "",
      description: null,
      // after the last one even if saved orders have gaps
      order: sections.length > 0 ? Math.max(...sections.map((s) => s.order)) + 1 : 0,
      score_weight: 1,
    };
    if (sections.length === 0) {
      setSections([newSection]);
      setFields((prev) => prev.map((f) => ({ ...f, section_id: newId })));
    } else {
      setSections((prev) => [...prev, newSection]);
    }
  };

  const removeSections = () => {
    applySections(
      [],
      fields.map((f) => ({ ...f, section_id: null })),
      "Branching rules were removed because the form no longer has sections."
    );
  };

  const updateSection = (sectionId: number, patch: Partial<FormSection>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s))
    );
  };

  const deleteSection = (sectionId: number) => {
    applySections(
      sections
        .filter((s) => s.id !== sectionId)
        .map((s, i) => ({ ...s, order: i })),
      fields.filter((f) => f.section_id !== sectionId),
      "Branching rules that pointed to the deleted section were cleared."
    );
  };

  const addFieldToSection = (sectionId: number) => {
    setFields((prev) => {
      const sectionFields = prev.filter((f) => f.section_id === sectionId);
      const newField = createField(sectionFields.length);
      newField.section_id = sectionId;
      setActiveId(newField.id);
      return [...prev, newField];
    });
  };

  const reorderFieldsInSection = (sectionId: number, reordered: FormField[]) => {
    setFields((prev) => {
      const others = prev.filter((f) => f.section_id !== sectionId);
      return [...others, ...reordered];
    });
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => `section-${s.id}` === active.id);
    const newIndex = sections.findIndex((s) => `section-${s.id}` === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    applySections(
      arrayMove(sections, oldIndex, newIndex).map((s, i) => ({ ...s, order: i })),
      fields,
      "Branching rules that no longer point to a later section were cleared."
    );
  };

  // ── Misc ────────────────────────────────────────────────────────────────────

  const changeFormType = (next: FormType) => {
    if (structureLocked) return;
    setFormType(next);
    // exams can't branch; questionnaires aren't graded
    const cleaned =
      next === "exam"
        ? sanitizeBranching(next, sections, fields)
        : cleanGrading(next, sections, fields);
    if (!cleaned.changed) return;
    setSections(cleaned.sections);
    setFields(cleaned.fields);
    showInfoToast(
      next === "exam"
        ? "Branching was removed because exams don't support it."
        : gradingClearedMessage(next)
    );
  };

  const toggleSubmitter = (v: SubmitterType) => {
    setSubmitterType((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (submitterType.length === 0) return false;
    if (hasSections) {
      if (sections.length === 0) return false;
      if (sections.some((s) => !s.title.trim())) return false;
      const sectionFields = fields.filter((f) => f.section_id != null);
      if (sectionFields.length === 0) return false;
      if (sectionFields.some((f) => !f.question.trim())) return false;
    } else {
      if (fields.length === 0) return false;
      if (fields.some((f) => !f.question.trim())) return false;
    }
    if (fields.some(hasTooFewOptions)) return false;
    return true;
  }, [name, submitterType, fields, sections, hasSections]);

  async function handleSave() {
    if (!canSubmit) {
      showErrorToast(
        "Please fill the form name, at least one submitter type, and all questions."
      );
      return;
    }
    const parsedTimeLimit = timeLimit.trim() === "" ? null : Number(timeLimit);
    const parsedMaxAttempts =
      maxAttempts.trim() === "" ? null : Number(maxAttempts);
    if (
      parsedTimeLimit != null &&
      (!Number.isFinite(parsedTimeLimit) || parsedTimeLimit < 1)
    ) {
      showErrorToast("Time limit must be a positive number");
      return;
    }
    if (
      parsedMaxAttempts != null &&
      (!Number.isFinite(parsedMaxAttempts) || parsedMaxAttempts < 1)
    ) {
      showErrorToast("Max attempts must be a positive number");
      return;
    }

    let structure: Pick<FormCreatePayload, "type" | "fields" | "sections">;
    // the editor's fields behind this save, so they keep their ids after it
    let sentFields: FormField[];
    if (structureLocked && form) {
      structure = {
        type: form.type,
        // is_required is wording, so this is allowed on a locked form
        fields: withExamRules(form.type, lockedFields(form, fields)),
        sections: lockedSections(form, sections),
      };
      sentFields = fields;
    } else {
      // last guards: drop branching rules and correct answers the backend would
      // reject (e.g. on emptied options); questionnaires carry no grading
      const branched = sanitizeBranching(formType, hasSections ? sections : [], fields);
      const cleaned = cleanGrading(formType, branched.sections, branched.fields);
      if (branched.changed || cleaned.changed) {
        setSections(cleaned.sections);
        setFields(cleaned.fields);
      }
      if (branched.changed) {
        showInfoToast(
          "Some branching rules were no longer valid and were removed before saving."
        );
      }
      if (cleaned.changed) showInfoToast(gradingClearedMessage(formType));
      structure = {
        type: formType,
        fields: withExamRules(formType, cleaned.fields).map(toFieldPayload),
        sections: hasSections ? cleaned.sections.map(toSectionPayload) : null,
      };
      sentFields = cleaned.fields;
    }

    const payload: Partial<FormCreatePayload> = {
      name: name.trim(),
      description: description.trim() || null,
      submitter_type: submitterType,
      assigned_to_units:
        selectedUnits.length > 0 ? selectedUnits.map((u) => u.id) : null,
      time_limit_minutes: structure.type === "exam" ? parsedTimeLimit : null,
      max_attempts: parsedMaxAttempts,
      results_revealed: resultsRevealed,
      ...structure,
    };
    setBusy(true);
    try {
      const updated = await formService.update(Number(id), payload);
      setForm(updated);
      // new fields now have ids; the next save must send them
      loadStructure(updated, editorIdsAfterSave(sentFields, updated));
      showSuccessToast("Form saved");
    } catch (e) {
      if (e instanceof HttpError && e.code === "form_has_submissions") {
        await lockAfterConflict();
      } else {
        showErrorToast(e instanceof Error ? e.message : "Failed to save form");
      }
    } finally {
      setBusy(false);
    }
  }

  // The form got responses after this page loaded it: lock the editor and undo
  // the structural edits, keeping the wording ones so a second save goes through.
  async function lockAfterConflict() {
    try {
      const saved = await formService.getById(Number(id));
      setForm(saved);
      setFormType(saved.type);
      loadStructure({
        ...saved,
        fields: lockedFields(saved, fields),
        sections: lockedSections(saved, sections),
      });
    } catch {
      // keep the editor as is; the banner below still explains the lock
    }
    setStructureLocked(true);
    showWarningToast(
      "This form has responses, so only wording can be changed. Structural edits were undone; save again to keep your wording changes.",
      7000
    );
  }

  // the backend allows the creator or a forms:manage holder to duplicate
  const canDuplicate =
    !!form && (form.created_by === user?.id || !!permissions["forms:manage"]);

  async function duplicate() {
    if (!form) return;
    setBusy(true);
    try {
      const copy = await formService.duplicate(form.id);
      showSuccessToast("Copy created. It's inactive, so you can change it freely.");
      router.push(`/form/${copy.id}`);
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : "Couldn't duplicate the form");
    } finally {
      setBusy(false);
    }
  }

  const lockReason = !form
    ? null
    : form.is_active
    ? "Deactivate the form before editing."
    : form.created_by !== null && user?.id !== form.created_by
    ? "Only the form creator can edit it."
    : null;

  const allowsPublic =
    form?.type === "questionnaire" &&
    (form?.submitter_type ?? []).includes("customer");

  const publicUrl =
    typeof window !== "undefined" && form?.public_token
      ? `${window.location.origin}/public/form/${form.public_token}`
      : null;

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      showSuccessToast("Public link copied");
    } catch {
      showErrorToast("Couldn't copy. Select and copy manually.");
    }
  }

  async function rotate() {
    if (!form) return;
    setBusy(true);
    try {
      const updated = await formService.rotatePublicToken(form.id);
      setForm(updated);
      showSuccessToast(
        form.public_token ? "Public link rotated" : "Public link generated"
      );
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function revoke() {
    if (!form) return;
    showConfirmToast({
      title: "Revoke public link?",
      message:
        "The current link will stop working. You can generate a new one later.",
      confirmText: "Revoke",
      onConfirm: async () => {
        setBusy(true);
        try {
          const updated = await formService.revokePublicToken(form.id);
          setForm(updated);
          showSuccessToast("Public link revoked");
        } catch (e) {
          showErrorToast(e instanceof Error ? e.message : "Failed");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  return (
    <div className="flex-1 min-h-screen bg-muted/40">
      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Link
            href="/form"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to forms
          </Link>
          {form && (
            <Link
              href={`/form/${id}/submissions`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-border bg-card hover:bg-muted/60 text-foreground"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              View submissions
            </Link>
          )}
        </div>

        {loading ? (
          <div className="rounded-lg bg-card border border-border p-10 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : !form ? (
          <div className="rounded-lg bg-card border border-border p-10 text-center text-sm text-muted-foreground">
            Form not found.
          </div>
        ) : (
          <>
            {lockReason && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>
                    <span className="font-medium">Read-only.</span> {lockReason}
                  </span>
                </div>
                {form.is_active && form.created_by === user?.id && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const updated = await formService.deactivate(form.id);
                        setForm(updated);
                        // responses may have come in while it was active
                        setStructureLocked(!!updated.has_submissions);
                        showSuccessToast("Form deactivated — you can now edit it.");
                      } catch (e) {
                        showErrorToast(e instanceof Error ? e.message : "Failed");
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-md text-xs border border-yellow-500/60 hover:bg-yellow-500/20 disabled:opacity-50 font-medium"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            )}

            {structureLocked && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Lock className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <span>
                    <span className="font-medium">
                      This form has responses; only wording can be changed.
                    </span>{" "}
                    <span className="text-muted-foreground">
                      You can still edit titles, descriptions, question text, help
                      text, required flags, question order and the form settings.
                      {canDuplicate &&
                        " To change the structure, duplicate it: the copy starts from the last saved version, with no responses."}
                    </span>
                  </span>
                </div>
                {canDuplicate && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={duplicate}
                    className="self-start shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-primary/40 bg-background text-foreground hover:bg-primary/10 disabled:opacity-50 font-medium"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Duplicate form
                  </button>
                )}
              </div>
            )}

            {/* ── header / meta ── */}
            <header className="rounded-lg bg-card text-card-foreground border border-border border-t-8 border-t-primary shadow-sm p-6 flex flex-col gap-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Untitled form"
                className="w-full bg-transparent outline-none border-b border-transparent focus:border-primary text-2xl font-semibold text-foreground placeholder:text-muted-foreground py-1"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Form description"
                className="w-full bg-transparent outline-none border-b border-transparent focus:border-primary text-sm text-foreground placeholder:text-muted-foreground py-1"
              />

              <div className="flex flex-col gap-2 pt-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Submitter type
                </span>
                <div className="flex gap-2 flex-wrap">
                  {SUBMITTER_OPTIONS.map((opt) => {
                    const active = submitterType.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleSubmitter(opt.value)}
                        disabled={hasUnits}
                        className={[
                          "px-3 py-1.5 rounded-full text-sm border transition-colors",
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:bg-muted/60",
                          hasUnits ? "opacity-60 cursor-not-allowed" : "",
                        ].join(" ")}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {hasUnits && (
                  <span className="text-xs text-muted-foreground">
                    Locked to Employee while units are assigned.
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Assigned units
                </span>
                <UnitsMultiSelect
                  value={selectedUnits}
                  onChange={setSelectedUnits}
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Form type
                </span>
                <div className="flex gap-2 flex-wrap">
                  {(["questionnaire", "exam"] as FormType[]).map((opt) => {
                    const active = formType === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => changeFormType(opt)}
                        disabled={structureLocked}
                        className={[
                          "px-3 py-1.5 rounded-full text-sm border transition-colors capitalize",
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:bg-muted/60",
                          structureLocked ? "opacity-60 cursor-not-allowed" : "",
                        ].join(" ")}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {structureLocked && (
                  <span className="text-xs text-muted-foreground">
                    The form type can&apos;t change once there are responses.
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {formType === "exam" && (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Time limit (minutes)
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(e.target.value)}
                      placeholder="e.g. 30"
                      className="px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground outline-none focus:border-primary"
                    />
                  </label>
                )}
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Max attempts
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(e.target.value)}
                    placeholder={formType === "exam" ? "1" : "unlimited"}
                    className="px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="flex items-center gap-2 self-end pb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resultsRevealed}
                    onChange={(e) => setResultsRevealed(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm text-foreground">
                    Reveal results to submitters
                  </span>
                </label>
              </div>
            </header>

            {/* ── sections toolbar ── */}
            <div className="flex items-center justify-between px-1 flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">
                {hasSections
                  ? `${sections.length} section${sections.length !== 1 ? "s" : ""}`
                  : "Flat layout"}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {formType === "exam" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Scoring</span>
                    <div className="flex items-center rounded-md border border-border overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() => setScoringMode("weight")}
                        className={[
                          "px-3 py-1.5 transition-colors",
                          scoringMode === "weight"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted/60",
                        ].join(" ")}
                      >
                        Points
                      </button>
                      <button
                        type="button"
                        onClick={() => setScoringMode("percentage")}
                        className={[
                          "px-3 py-1.5 transition-colors",
                          scoringMode === "percentage"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted/60",
                        ].join(" ")}
                      >
                        %
                      </button>
                    </div>
                    {scoringMode === "percentage" && hasSections && (
                      <span className={["text-xs", totalSectionWeight > 100 ? "text-destructive" : "text-muted-foreground"].join(" ")}>
                        {totalSectionWeight}% / 100%
                      </span>
                    )}
                  </div>
                )}
                {hasSections && !structureLocked && (
                  <button
                    type="button"
                    onClick={removeSections}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Remove sections
                  </button>
                )}
                {!structureLocked && (
                  <button
                    type="button"
                    onClick={addSection}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background text-sm text-foreground hover:bg-muted/60"
                  >
                    <LayoutList className="h-4 w-4" />
                    {hasSections ? "Add section" : "Add sections"}
                  </button>
                )}
              </div>
            </div>

            {/* ── questions / sections ── */}
            {hasSections ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSectionDragEnd}
              >
                <SortableContext
                  items={sections.map((s) => `section-${s.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-6">
                    {sections.map((section, idx) => (
                      <SectionCard
                        key={section.id}
                        section={section}
                        fields={fields
                          .filter((f) => f.section_id === section.id)
                          .sort((a, b) => a.order - b.order)}
                        isExam={formType === "exam"}
                        scoringMode={scoringMode}
                        maxWeight={scoringMode === "percentage" ? 100 - (totalSectionWeight - section.score_weight) : undefined}
                        position={idx + 1}
                        totalSections={sections.length}
                        branchTargets={
                          formType === "questionnaire"
                            ? sectionBranchTargets(sections, section.id)
                            : undefined
                        }
                        locked={structureLocked}
                        activeFieldId={activeId}
                        onUpdateSection={(patch) =>
                          updateSection(section.id, patch)
                        }
                        onDeleteSection={() => deleteSection(section.id)}
                        onAddField={() => addFieldToSection(section.id)}
                        onUpdateField={(fieldId, patch) =>
                          updateField(fieldId, patch)
                        }
                        onDeleteField={(fieldId) => deleteField(fieldId)}
                        onDuplicateField={(fieldId) => duplicateField(fieldId)}
                        onFocusField={(fid) => setActiveId(fid)}
                        onReorderFields={(reordered) =>
                          reorderFieldsInSection(section.id, reordered)
                        }
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={fields.map((f) => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-4">
                      {fields.map((field) => (
                        <FieldCard
                          key={field.id}
                          field={field}
                          isActive={activeId === field.id}
                          isExam={formType === "exam"}
                          scoringMode={scoringMode}
                          onFocus={() => setActiveId(field.id)}
                          onChange={(patch) => updateField(field.id, patch)}
                          onDelete={() => deleteField(field.id)}
                          onDuplicate={() => duplicateField(field.id)}
                          locked={structureLocked}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {!structureLocked && (
                  <button
                    type="button"
                    onClick={addField}
                    className="self-center mt-2 flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 shadow-sm text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Add question
                  </button>
                )}
              </>
            )}

            {/* ── public link ── */}
            <section className="rounded-lg bg-card border border-border shadow-sm p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  Public link
                </h2>
              </div>

              {!allowsPublic ? (
                <p className="text-sm text-muted-foreground">
                  Public links are only available for questionnaires that accept
                  customer submissions.
                </p>
              ) : form.public_token && publicUrl ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                    <input
                      readOnly
                      value={publicUrl}
                      className="flex-1 bg-transparent outline-none text-sm text-foreground"
                    />
                    <button
                      type="button"
                      onClick={copyLink}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-border hover:bg-muted/60"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={rotate}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs border border-border hover:bg-muted/60 disabled:opacity-50"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Rotate
                    </button>
                    <button
                      type="button"
                      onClick={revoke}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Revoke
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm text-muted-foreground">
                    No public link yet.
                  </p>
                  <button
                    type="button"
                    onClick={rotate}
                    disabled={busy}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    <Link2 className="h-3 w-3" />
                    Generate link
                  </button>
                </div>
              )}
            </section>

            {/* ── actions ── */}
            <div className="flex justify-between gap-2 pb-10 flex-wrap">
              {!form.is_active && form.created_by === user?.id && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const updated = await formService.activate(form.id);
                      setForm(updated);
                      showSuccessToast("Form activated.");
                    } catch (e) {
                      showErrorToast(e instanceof Error ? e.message : "Failed");
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="px-4 py-2 rounded-md border border-border bg-background text-foreground text-sm font-medium hover:bg-muted/60 disabled:opacity-50"
                >
                  Activate
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <Link
                  href="/form"
                  className="px-4 py-2 rounded-md border border-border bg-background text-foreground text-sm font-medium hover:bg-muted/60"
                >
                  Cancel
                </Link>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSubmit || busy || !!lockReason}
                  title={lockReason ?? undefined}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {lockReason && <AlertCircle className="h-3.5 w-3.5" />}
                  {busy ? "Saving..." : "Save form"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
