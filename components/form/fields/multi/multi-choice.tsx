"use client";

import { Plus, Square, X } from "lucide-react";
import type { FormField } from "@/dto/form/form-field";

interface Props {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
}

export default function MultiChoice({ field, onChange }: Props) {
  const options = field.options ?? [];

  const updateOption = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    onChange({ options: next });
  };

  const removeOption = (index: number) => {
    if (options.length <= 1) return;
    onChange({ options: options.filter((_, i) => i !== index) });
  };

  const addOption = () => {
    onChange({ options: [...options, `Option ${options.length + 1}`] });
  };

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-3 group">
          <Square className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={opt}
            onChange={(e) => updateOption(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            className="flex-1 bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none py-1 text-sm text-foreground"
          />
          {options.length > 1 && (
            <button
              type="button"
              onClick={() => removeOption(i)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
              aria-label="Remove option"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addOption}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mt-1 w-fit"
      >
        <Plus className="h-4 w-4" />
        Add option
      </button>
    </div>
  );
}
