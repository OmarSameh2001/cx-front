"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Plus, X, ChevronDown } from "lucide-react";
import FieldCard from "@/components/form/field-card";
import { createField, type FormField } from "@/dto/form/form-field";
import type {
  FormCreatePayload,
  FormFieldCreatePayload,
  SubmitterType,
} from "@/dto/form/form";
import type { LookupResult } from "@/dto/lookup/lookup";
import { FormService } from "@/services/form/form";
import { LookupService } from "@/services/lookup/lookup";

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
  };
}

export default function FormCreatePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitterType, setSubmitterType] = useState<SubmitterType[]>([
    "employee",
  ]);
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
  const [activeId, setActiveId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const toggleSubmitter = (v: SubmitterType) => {
    setSubmitterType((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (submitterType.length === 0) return false;
    if (fields.length === 0) return false;
    if (fields.some((f) => !f.question.trim())) return false;
    return true;
  }, [name, submitterType, fields]);

  const handleSubmit = async () => {
    setError(null);
    if (!canSubmit) {
      setError("Please fill the form name, at least one submitter type, and all questions.");
      return;
    }
    const payload: FormCreatePayload = {
      name: name.trim(),
      description: description.trim() || null,
      submitter_type: submitterType,
      assigned_to_units:
        selectedUnits.length > 0 ? selectedUnits.map((u) => u.id) : null,
      fields: fields.map(toFieldPayload),
    };
    setSubmitting(true);
    try {
      const created = await formService.create(payload);
      router.push(`/form/${created.id}`);
    } catch (e) {
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
        </header>

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

function UnitsMultiSelect({
  value,
  onChange,
}: {
  value: LookupResult[];
  onChange: (next: LookupResult[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<LookupResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await lookupService.units(search || undefined);
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, search]);

  const selectedIds = useMemo(
    () => new Set(value.map((u) => u.id)),
    [value]
  );

  const toggle = (unit: LookupResult) => {
    if (selectedIds.has(unit.id)) {
      onChange(value.filter((u) => u.id !== unit.id));
    } else {
      onChange([...value, unit]);
    }
  };

  const remove = (id: number) => {
    onChange(value.filter((u) => u.id !== id));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full min-h-10 flex items-center gap-2 flex-wrap px-3 py-2 rounded-md border border-border bg-background hover:bg-muted/60 text-sm text-foreground"
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground">Select units...</span>
        ) : (
          value.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs"
            >
              {u.name}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(u.id);
                }}
                className="hover:text-destructive cursor-pointer"
                aria-label={`Remove ${u.name}`}
              >
                <X className="h-3 w-3" />
              </span>
            </span>
          ))
        )}
        <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-md border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden">
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search units..."
                className="w-full px-2 py-1.5 rounded-md bg-background border border-border outline-none focus:border-primary text-sm"
              />
            </div>
            <ul className="max-h-60 overflow-y-auto">
              {loading && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  Loading...
                </li>
              )}
              {!loading && results.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  No units found.
                </li>
              )}
              {!loading &&
                results.map((u) => {
                  const checked = selectedIds.has(u.id);
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => toggle(u)}
                        className={[
                          "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground",
                          checked
                            ? "bg-accent/60 text-accent-foreground"
                            : "",
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          readOnly
                          checked={checked}
                          className="h-4 w-4 accent-primary"
                        />
                        {u.name}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
