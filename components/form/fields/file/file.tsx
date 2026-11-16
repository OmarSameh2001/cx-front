"use client";

import { UploadCloud } from "lucide-react";

import type { FormField } from "@/dto/form/form-field";
import {
  TYPE_PRESETS,
  parseQuestionLimits,
  presetIndexFor,
  serializeQuestionLimits,
} from "@/utils/file/question-limits";

interface Props {
  field?: FormField;
  onChange?: (patch: Partial<FormField>) => void;
  // the form has responses: its structure (options included) can't change
  locked?: boolean;
}

// Builder view of a file question: a preview of the upload box, and this
// question's own limits. They can only tighten the organisation's limits.
export default function FileField({ field, onChange, locked }: Props) {
  const limits = parseQuestionLimits(field?.options);
  const preset = presetIndexFor(limits.types);
  const editable = !!field && !!onChange && !locked;
  const inputCls =
    "w-full px-3 py-2 rounded-md border border-border bg-background outline-none focus:border-primary text-sm text-foreground disabled:opacity-60";

  function update(next: typeof limits) {
    onChange?.({ options: serializeQuestionLimits(next, field?.options) });
  }

  const typeLabel = TYPE_PRESETS[preset].types ? TYPE_PRESETS[preset].label : "Allowed files";
  const sizeLabel = limits.maxMb ? `up to ${limits.maxMb} MB` : "up to the organisation's limit";

  return (
    <div className="flex flex-col gap-3">
      <div className="border-2 border-dashed border-border rounded-md p-4 sm:p-6 flex flex-col items-center justify-center gap-2 bg-muted/30 text-center">
        <UploadCloud className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-foreground font-medium">Click to upload or drag and drop</p>
        <p className="text-xs text-muted-foreground">
          {typeLabel}, {sizeLabel}
        </p>
      </div>

      {field && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Max size (MB)
            <input
              type="number"
              min={0.1}
              step={0.1}
              placeholder="Organisation limit"
              value={limits.maxMb ?? ""}
              disabled={!editable}
              onChange={(e) => update({ ...limits, maxMb: e.target.value ? Number(e.target.value) : undefined })}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Allowed files
            <select
              value={preset}
              disabled={!editable}
              onChange={(e) => update({ ...limits, types: TYPE_PRESETS[Number(e.target.value)].types ?? undefined })}
              className={inputCls}
            >
              {TYPE_PRESETS.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground sm:mt-5 cursor-pointer">
            <input
              type="checkbox"
              checked={!!limits.keepOriginal}
              disabled={!editable}
              onChange={(e) => update({ ...limits, keepOriginal: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
            Keep original images (no compression)
          </label>
        </div>
      )}
    </div>
  );
}
