"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Copy,
  GripVertical,
  Trash2,
  Type,
  CircleDot,
  ListChecks,
  ToggleLeft,
  Calendar,
  Phone,
  Mail,
  Upload,
  BarChart3,
} from "lucide-react";
import {
  FIELD_TYPE_LABELS,
  withDefaultsForType,
  type FieldType,
  type FormField,
} from "@/dto/form/form-field";
import SingleChoice from "./fields/single/single-choice";
import MultiChoice from "./fields/multi/multi-choice";
import BooleanField from "./fields/boolean/boolean";
import TextField from "./fields/text/text";
import DateField from "./fields/date/date";
import PhoneField from "./fields/phone/phone";
import EmailField from "./fields/email/email";
import FileField from "./fields/file/file";
import ScaleField from "./fields/scale/scale";

interface Props {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  isActive?: boolean;
  isExam?: boolean;
  scoringMode?: "weight" | "percentage";
  /** Max allowed score_weight for this field (used in percentage mode to cap at remaining budget). */
  maxScore?: number;
  onFocus?: () => void;
}

const TYPE_ICONS: Record<FieldType, React.ComponentType<{ className?: string }>> = {
  single_choice: CircleDot,
  multi_choice: ListChecks,
  boolean: ToggleLeft,
  text: Type,
  date: Calendar,
  phone_number: Phone,
  email: Mail,
  file: Upload,
  scale: BarChart3,
};

function isAutoGradable(type: FieldType): boolean {
  return type === "single_choice" || type === "multi_choice" || type === "boolean";
}

function RightAnswerInput({
  field,
  onChange,
}: {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
}) {
  if (field.type === "boolean") {
    const value = field.right_answer ?? "";
    return (
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Correct answer</span>
        <select
          value={value}
          onChange={(e) => onChange({ right_answer: e.target.value || undefined })}
          className="px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="">—</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
    );
  }
  if (field.type === "single_choice") {
    const options = field.options ?? [];
    const value = field.right_answer ?? "";
    return (
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Correct answer</span>
        <select
          value={value}
          onChange={(e) => onChange({ right_answer: e.target.value || undefined })}
          className="px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (field.type === "multi_choice") {
    const options = field.options ?? [];
    const selected = new Set(
      (field.right_answer ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    const toggle = (opt: string) => {
      if (selected.has(opt)) selected.delete(opt);
      else selected.add(opt);
      const joined = Array.from(selected).join(",");
      onChange({ right_answer: joined || undefined });
    };
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">
          Correct answers (any of)
        </span>
        <div className="flex flex-wrap gap-1">
          {options.map((o) => (
            <button
              type="button"
              key={o}
              onClick={() => toggle(o)}
              className={[
                "px-2 py-1 rounded-full text-xs border",
                selected.has(o)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted/60",
              ].join(" ")}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function FieldBody({
  field,
  onChange,
}: {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
}) {
  switch (field.type) {
    case "single_choice":
      return <SingleChoice field={field} onChange={onChange} />;
    case "multi_choice":
      return <MultiChoice field={field} onChange={onChange} />;
    case "boolean":
      return <BooleanField />;
    case "text":
      return <TextField />;
    case "date":
      return <DateField />;
    case "phone_number":
      return <PhoneField />;
    case "email":
      return <EmailField />;
    case "file":
      return <FileField />;
    case "scale":
      return <ScaleField field={field} onChange={onChange} />;
  }
}

export default function FieldCard({
  field,
  onChange,
  onDelete,
  onDuplicate,
  isActive,
  isExam,
  scoringMode = "weight",
  maxScore,
  onFocus,
}: Props) {
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTypeChange = (type: FieldType) => {
    onChange(withDefaultsForType({ ...field, type }, type));
    setTypeMenuOpen(false);
  };

  const TypeIcon = TYPE_ICONS[field.type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onFocus}
      className={[
        "relative rounded-lg bg-card text-card-foreground border shadow-sm",
        "transition-shadow",
        isActive
          ? "border-l-4 border-l-primary shadow-md"
          : "border-border hover:shadow-md",
      ].join(" ")}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="absolute top-1 left-1/2 -translate-x-1/2 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1"
      >
        <GripVertical className="h-4 w-4 rotate-90" />
      </button>

      <div className="p-6 pt-7 flex flex-col gap-4">
        {/* Header: question + type selector */}
        <div className="flex items-start gap-3 flex-col md:flex-row">
          <div className="flex-1 flex flex-col gap-2">
            <input
              type="text"
              value={field.question}
              onChange={(e) => onChange({ question: e.target.value })}
              placeholder="Question"
              className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-transparent border-b border-transparent focus:border-primary outline-none px-3 py-2 text-base text-foreground rounded-t-md transition"
            />
            {(isActive || field.help_text) && (
              <input
                type="text"
                value={field.help_text ?? ""}
                onChange={(e) => onChange({ help_text: e.target.value })}
                placeholder="Description (optional)"
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none px-3 py-1 text-xs text-muted-foreground"
              />
            )}
          </div>

          {/* Type selector */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTypeMenuOpen((v) => !v);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background hover:bg-muted/60 text-sm text-foreground min-w-[180px]"
            >
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left">
                {FIELD_TYPE_LABELS[field.type]}
              </span>
            </button>
            {typeMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setTypeMenuOpen(false)}
                />
                <ul className="absolute right-0 top-full mt-1 z-20 w-56 rounded-md border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden">
                  {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => {
                    const Icon = TYPE_ICONS[t];
                    return (
                      <li key={t}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTypeChange(t);
                          }}
                          className={[
                            "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground",
                            t === field.type
                              ? "bg-accent/60 text-accent-foreground"
                              : "",
                          ].join(" ")}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {FIELD_TYPE_LABELS[t]}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="pl-1">
          <FieldBody field={field} onChange={onChange} />
        </div>

        {/* Grading controls (for auto-gradable types) */}
        {isAutoGradable(field.type) && (isActive || isExam) && (
          <div className="flex flex-col gap-2 pt-3 border-t border-border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Grading
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <RightAnswerInput field={field} onChange={onChange} />
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  {scoringMode === "percentage" ? "Score %" : "Score weight"}
                </span>
                {scoringMode === "percentage" ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="1"
                      min={0}
                      max={maxScore ?? 100}
                      value={field.score_weight}
                      onChange={(e) =>
                        onChange({ score_weight: Math.min(maxScore ?? 100, Math.max(0, Number(e.target.value) || 0)) })
                      }
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground outline-none focus:border-primary"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                ) : (
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={field.score_weight}
                    onChange={(e) =>
                      onChange({ score_weight: Number(e.target.value) || 0 })
                    }
                    className="px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground outline-none focus:border-primary"
                  />
                )}
              </label>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-1 pt-3 border-t border-border">
          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              aria-label="Duplicate"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete"
            className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted/60"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <div className="mx-2 h-6 w-px bg-border" />

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-sm text-foreground">Required</span>
            <span
              className={[
                "relative inline-flex h-5 w-9 rounded-full transition-colors",
                field.is_required ? "bg-primary" : "bg-muted",
              ].join(" ")}
            >
              <input
                type="checkbox"
                checked={field.is_required}
                onChange={(e) =>
                  onChange({ is_required: e.target.checked })
                }
                className="sr-only"
              />
              <span
                className={[
                  "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform",
                  field.is_required ? "translate-x-4" : "translate-x-0.5",
                ].join(" ")}
              />
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
