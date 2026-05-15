"use client";

import type { FormFieldRead } from "@/dto/form/form";

interface Props {
  field: FormFieldRead;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export default function AnswerField({ field, value, onChange, disabled }: Props) {
  const inputCls =
    "w-full px-3 py-2 rounded-md border border-border bg-background outline-none focus:border-primary text-sm text-foreground disabled:opacity-60";

  switch (field.type) {
    case "single_choice":
    case "boolean": {
      const options =
        field.type === "boolean" ? ["true", "false"] : field.options ?? [];
      const labels: Record<string, string> =
        field.type === "boolean" ? { true: "Yes", false: "No" } : {};
      const selected = value == null ? "" : String(value);
      return (
        <div className="flex flex-col gap-2">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-3 cursor-pointer text-sm text-foreground"
            >
              <input
                type="radio"
                name={`field-${field.id}`}
                value={opt}
                checked={selected === opt}
                onChange={() => onChange(opt)}
                disabled={disabled}
                className="h-4 w-4 accent-primary"
              />
              {labels[opt] ?? opt}
            </label>
          ))}
        </div>
      );
    }
    case "multi_choice": {
      const options = field.options ?? [];
      const selected = Array.isArray(value)
        ? (value as string[]).map(String)
        : typeof value === "string" && value
        ? value.split(",").map((s) => s.trim())
        : [];
      const toggle = (opt: string) => {
        if (disabled) return;
        const has = selected.includes(opt);
        const next = has
          ? selected.filter((s) => s !== opt)
          : [...selected, opt];
        onChange(next);
      };
      return (
        <div className="flex flex-col gap-2">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-3 cursor-pointer text-sm text-foreground"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                disabled={disabled}
                className="h-4 w-4 accent-primary"
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }
    case "text":
      return (
        <textarea
          rows={3}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputCls}
        />
      );
    case "date":
      return (
        <input
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputCls}
        />
      );
    case "email":
      return (
        <input
          type="email"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputCls}
        />
      );
    case "phone_number":
      return (
        <input
          type="tel"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputCls}
        />
      );
    case "scale": {
      const labels = field.options ?? ["", ""];
      const length = 5;
      const selected = typeof value === "number" ? value : Number(value) || 0;
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            {Array.from({ length }, (_, i) => i + 1).map((n) => (
              <label
                key={n}
                className="flex flex-col items-center gap-1 cursor-pointer"
              >
                <span className="text-xs text-muted-foreground">{n}</span>
                <input
                  type="radio"
                  name={`field-${field.id}`}
                  value={n}
                  checked={selected === n}
                  onChange={() => onChange(n)}
                  disabled={disabled}
                  className="h-4 w-4 accent-primary"
                />
              </label>
            ))}
          </div>
          {(labels[0] || labels[1]) && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{labels[0]}</span>
              <span>{labels[1]}</span>
            </div>
          )}
        </div>
      );
    }
    case "file":
      return (
        <input
          type="file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            onChange(f ? f.name : "");
          }}
          disabled={disabled}
          className={inputCls}
        />
      );
    default:
      return (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputCls}
        />
      );
  }
}
