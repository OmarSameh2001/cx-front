"use client";

import { useRef } from "react";
import { Circle, Plus, X } from "lucide-react";
import {
  MIN_CHOICE_OPTIONS,
  renameInRightAnswer,
  validRightAnswer,
  type FormField,
} from "@/dto/form/form-field";
import {
  dropBranchKey,
  renameBranchKey,
  type OptionRename,
} from "@/utils/form/branching";

interface Props {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
  /** Options are frozen (form has responses). */
  locked?: boolean;
  /** Reports the option being renamed, so its rule and answer can still be shown mid-edit. */
  onRenaming?: (rename: OptionRename | null) => void;
}

export default function SingleChoice({ field, onChange, locked, onRenaming }: Props) {
  const options = field.options ?? [];
  // text of the option when editing started; its rule and answer move on blur
  const renameFrom = useRef<string | null>(null);

  const updateOption = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    onChange({ options: next });
    if (renameFrom.current != null) onRenaming?.({ from: renameFrom.current, to: value });
  };

  // branching and the correct answer are keyed by option text, so they follow
  // the finished rename
  const finishRename = (value: string) => {
    const from = renameFrom.current;
    renameFrom.current = null;
    onRenaming?.(null);
    if (from != null && from !== value) {
      onChange({
        branching: renameBranchKey(field.branching, from, value, options),
        right_answer: renameInRightAnswer(field, from, value, options),
      });
    }
  };

  const removeOption = (index: number) => {
    if (options.length <= MIN_CHOICE_OPTIONS) return;
    const next = options.filter((_, i) => i !== index);
    onChange({
      options: next,
      branching: dropBranchKey(field.branching, options[index], next),
      right_answer: validRightAnswer(field.type, next, field.right_answer),
    });
  };

  const addOption = () => {
    onChange({ options: [...options, `Option ${options.length + 1}`] });
  };

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-3 group">
          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={opt}
            onFocus={() => {
              renameFrom.current = opt;
            }}
            onChange={(e) => updateOption(i, e.target.value)}
            onBlur={(e) => finishRename(e.target.value)}
            placeholder={`Option ${i + 1}`}
            className="flex-1 bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none py-1 text-sm text-foreground"
          />
          {options.length > MIN_CHOICE_OPTIONS && !locked && (
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
      {!locked && (
        <button
          type="button"
          onClick={addOption}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mt-1 w-fit"
        >
          <Plus className="h-4 w-4" />
          Add option
        </button>
      )}
    </div>
  );
}
