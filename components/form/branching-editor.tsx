"use client";

import { GitBranch } from "lucide-react";
import type { FormField } from "@/dto/form/form-field";
import {
  branchAnswers,
  decodeTarget,
  encodeTarget,
  ruleFor,
  setBranchRule,
  type BranchTarget,
  type OptionRename,
} from "@/utils/form/branching";

interface Props {
  field: FormField;
  targets: BranchTarget[];
  /** Set when another question in the section already branches. */
  disabledReason?: string | null;
  /** Option being edited; its rule moves to the new text when editing ends. */
  renaming?: OptionRename | null;
  onChange: (patch: Partial<FormField>) => void;
}

export default function BranchingEditor({
  field,
  targets,
  disabledReason,
  renaming,
  onChange,
}: Props) {
  const answers = branchAnswers(field);

  // mid-rename the rule is still stored under the old text
  const ruleOf = (key: string) =>
    renaming && key === renaming.to && ruleFor(field.branching, renaming.from) !== undefined
      ? ruleFor(field.branching, renaming.from)
      : ruleFor(field.branching, key);

  const setRule = (key: string, value: string) => {
    onChange({ branching: setBranchRule(field.branching, key, decodeTarget(value)) });
  };

  return (
    <div className="flex flex-col gap-2 pt-3 border-t border-border">
      <div className="flex items-center gap-2">
        <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Go to section based on answer
        </span>
      </div>
      {disabledReason && (
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      )}
      {answers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Add options to set up branching.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {answers.map(({ key, label }) => (
            <label
              key={key}
              className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] items-center gap-1 sm:gap-3"
            >
              <span className="text-sm text-foreground min-w-0 break-words">
                {label}
              </span>
              <select
                value={encodeTarget(ruleOf(key))}
                onChange={(e) => setRule(key, e.target.value)}
                disabled={!!disabledReason}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">Default (no rule)</option>
                {targets.map((t) => (
                  <option key={encodeTarget(t.value)} value={encodeTarget(t.value)}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
