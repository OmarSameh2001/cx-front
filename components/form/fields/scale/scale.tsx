"use client";

import type { FormField } from "@/dto/form/form-field";

interface Props {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
}

const SCALE_LENGTH = 5;

export default function ScaleField({ field, onChange }: Props) {
  const labels = field.options ?? ["", ""];
  const [low = "", high = ""] = labels;

  const setLow = (value: string) => onChange({ options: [value, high] });
  const setHigh = (value: string) => onChange({ options: [low, value] });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 flex-wrap">
        {Array.from({ length: SCALE_LENGTH }, (_, i) => i + 1).map((n) => (
          <div key={n} className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">{n}</span>
            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/40" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 max-w-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-4 text-right">1</span>
          <input
            type="text"
            value={low}
            onChange={(e) => setLow(e.target.value)}
            placeholder="Label (optional)"
            className="flex-1 bg-transparent border-b border-border focus:border-primary outline-none py-1 text-sm text-foreground"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-4 text-right">
            {SCALE_LENGTH}
          </span>
          <input
            type="text"
            value={high}
            onChange={(e) => setHigh(e.target.value)}
            placeholder="Label (optional)"
            className="flex-1 bg-transparent border-b border-border focus:border-primary outline-none py-1 text-sm text-foreground"
          />
        </div>
      </div>
    </div>
  );
}
