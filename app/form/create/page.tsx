"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { LayoutList, Plus } from "lucide-react";
import { UnitsMultiSelect } from "@/components/units-multi-select";
import FieldCard from "@/components/form/field-card";
import SectionCard from "@/components/form/section-card";
import { createField, type FormField } from "@/dto/form/form-field";
import type {
  FormCreatePayload,
  FormFieldCreatePayload,
  FormSection,
  FormType,
  SubmitterType,
} from "@/dto/form/form";
import type { LookupResult } from "@/dto/lookup/lookup";
import { FormService } from "@/services/form/form";
import { LookupService } from "@/services/lookup/lookup";
import { showErrorToast, showSuccessToast } from "@/utils/toaster/toaster";

const formService = new FormService();
const lookupService = new LookupService();

const SUBMITTER_OPTIONS: { value: SubmitterType; label: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "customer", label: "Customer" },
];

function toFieldPayload(f: FormField): FormFieldCreatePayload {
  return {
    question: f.question,
    type: f.type,
    options: f.options ?? null,
    right_answer: f.right_answer ?? null,
    order: f.order,
    help_text: f.help_text ?? null,
    is_required: f.is_required,
    score_weight: f.score_weight,
    section_id: f.section_id ?? null,
  };
}

export default function FormCreatePage() {
  const router = useRouter();
  const nextSectionId = useRef(1);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitterType, setSubmitterType] = useState<SubmitterType[]>([
    "employee",
  ]);
  const [formType, setFormType] = useState<FormType>("questionnaire");
  const [timeLimit, setTimeLimit] = useState<string>("");
  const [maxAttempts, setMaxAttempts] = useState<string>("");
  const [resultsRevealed, setResultsRevealed] = useState<boolean>(false);
  const [selectedUnits, setSelectedUnits] = useState<LookupResult[]>([]);
  const hasUnits = selectedUnits.length > 0;

  useEffect(() => {
    if (hasUnits) {
      setSubmitterType((prev) =>
        prev.length === 1 && prev[0] === "employee" ? prev : ["employee"]
      );
    }
  }, [hasUnits]);

  const [fields, setFields] = useState<FormField[]>(() => [createField(0)]);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const hasSections = sections.length > 0;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Flat-mode field operations ──────────────────────────────────────────────

  const updateField = (id: string, patch: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  };

  const deleteField = (id: string) => {
    setFields((prev) =>
      prev.filter((f) => f.id !== id).map((f, i) => ({ ...f, order: i }))
    );
  };

  const duplicateField = (id: string) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const clone: FormField = {
        ...prev[idx],
        id: crypto.randomUUID(),
        options: prev[idx].options ? [...prev[idx].options!] : undefined,
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

  const addSection = () => {
    const id = nextSectionId.current++;
    const newSection: FormSection = {
      id,
      title: "",
      description: null,
      order: sections.length,
      score_weight: 1,
    };
    if (sections.length === 0) {
      // First section: migrate all existing fields into it
      setSections([newSection]);
      setFields((prev) =>
        prev.map((f) => ({ ...f, section_id: id }))
      );
    } else {
      setSections((prev) => [...prev, newSection]);
    }
  };

  const removeSections = () => {
    setSections([]);
    setFields((prev) => prev.map((f) => ({ ...f, section_id: null })));
  };

  const updateSection = (id: number, patch: Partial<FormSection>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const deleteSection = (id: number) => {
    setSections((prev) => {
      const remaining = prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i }));
      return remaining;
    });
    setFields((prev) => prev.filter((f) => f.section_id !== id));
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
    setSections((prev) => {
      const oldIndex = prev.findIndex((s) => `section-${s.id}` === active.id);
      const newIndex = prev.findIndex((s) => `section-${s.id}` === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex).map((s, i) => ({
        ...s,
        order: i,
      }));
    });
  };

  // ── Misc ────────────────────────────────────────────────────────────────────

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
    return true;
  }, [name, submitterType, fields, sections, hasSections]);

  const handleSubmit = async () => {
    setError(null);
    if (!canSubmit) {
      showErrorToast(
        "Please fill the form name, at least one submitter type, and all questions."
      );
      setError(
        "Please fill the form name, at least one submitter type, and all questions."
      );
      return;
    }
    const parsedTimeLimit =
      timeLimit.trim() === "" ? null : Number(timeLimit);
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
    const payload: FormCreatePayload = {
      name: name.trim(),
      description: description.trim() || null,
      type: formType,
      submitter_type: submitterType,
      assigned_to_units:
        selectedUnits.length > 0 ? selectedUnits.map((u) => u.id) : null,
      time_limit_minutes: formType === "exam" ? parsedTimeLimit : null,
      max_attempts: parsedMaxAttempts,
      results_revealed: resultsRevealed,
      fields: fields.map(toFieldPayload),
      sections: hasSections ? sections : null,
    };
    setSubmitting(true);
    try {
      const created = await formService.create(payload);
      showSuccessToast("Form created successfully");
      router.push(`/form/${created.id}`);
    } catch (e) {
      showErrorToast("Failed to create form");
      setError(e instanceof Error ? e.message : "Failed to create form");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-muted/40">
      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-4">
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
                    onClick={() => setFormType(opt)}
                    className={[
                      "px-3 py-1.5 rounded-full text-sm border transition-colors capitalize",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:bg-muted/60",
                    ].join(" ")}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
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

        {/* Sections toolbar */}
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-muted-foreground">
            {hasSections
              ? `${sections.length} section${sections.length !== 1 ? "s" : ""}`
              : "Flat layout"}
          </span>
          <div className="flex items-center gap-2">
            {hasSections && (
              <button
                type="button"
                onClick={removeSections}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Remove sections
              </button>
            )}
            <button
              type="button"
              onClick={addSection}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background text-sm text-foreground hover:bg-muted/60"
            >
              <LayoutList className="h-4 w-4" />
              {hasSections ? "Add section" : "Add sections"}
            </button>
          </div>
        </div>

        {/* Fields / Sections area */}
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
                {sections.map((section) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    fields={fields
                      .filter((f) => f.section_id === section.id)
                      .sort((a, b) => a.order - b.order)}
                    isExam={formType === "exam"}
                    activeFieldId={activeId}
                    onUpdateSection={(patch) => updateSection(section.id, patch)}
                    onDeleteSection={() => deleteSection(section.id)}
                    onAddField={() => addFieldToSection(section.id)}
                    onUpdateField={(fieldId, patch) => updateField(fieldId, patch)}
                    onDeleteField={(fieldId) => deleteField(fieldId)}
                    onDuplicateField={(fieldId) => duplicateField(fieldId)}
                    onFocusField={(id) => setActiveId(id)}
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
                      onFocus={() => setActiveId(field.id)}
                      onChange={(patch) => updateField(field.id, patch)}
                      onDelete={() => deleteField(field.id)}
                      onDuplicate={() => duplicateField(field.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <button
              type="button"
              onClick={addField}
              className="self-center mt-2 flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 shadow-sm text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add question
            </button>
          </>
        )}

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm px-4 py-2">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pb-10">
          <button
            type="button"
            onClick={() => router.push("/form")}
            disabled={submitting}
            className="px-4 py-2 rounded-md border border-border bg-background text-foreground text-sm font-medium hover:bg-muted/60 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save form"}
          </button>
        </div>
      </div>
    </div>
  );
}
