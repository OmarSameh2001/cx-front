"use client";

import { useCallback, useMemo, useState } from "react";
import type { SectionTarget } from "@/dto/form/form";
import { nextSectionId, orderedSections } from "./branching";

interface PagerSection {
  id: number;
  title: string;
  description?: string | null;
  order?: number | null;
  next_section_id?: SectionTarget | null;
}

interface PagerField {
  id: number;
  type: string;
  order?: number | null;
  section_id?: number | null;
  branching?: Record<string, SectionTarget> | null;
}

/**
 * The longest start of `history` that still follows the rules from the first
 * section. A live path always does; a restored one may predate an edit to the
 * form, and is cut where it stops matching.
 */
function followedPath(
  history: number[],
  ordered: PagerSection[],
  fields: PagerField[],
  answers: Record<string, unknown>
): number[] {
  const firstId = ordered[0]?.id;
  if (firstId == null) return [];
  const path = [firstId];
  if (history[0] !== firstId) return path;
  for (const id of history.slice(1)) {
    if (nextSectionId(ordered, fields, path[path.length - 1], answers) !== id) break;
    path.push(id);
  }
  return path;
}

/**
 * One section per page, following branching. `path` is the stack of visited
 * section ids, so Back returns to the page the respondent actually came from
 * even when branching skipped sections. Pass null sections to disable paging.
 */
export function useSectionPager<S extends PagerSection>(
  sections: S[] | null,
  fields: PagerField[],
  answers: Record<string, unknown>
) {
  const ordered = useMemo(() => orderedSections(sections ?? []), [sections]);
  const [history, setHistory] = useState<number[]>([]);

  const path = followedPath(history, ordered, fields, answers);
  const currentId = path.length > 0 ? path[path.length - 1] : null;
  const current = ordered.find((s) => s.id === currentId) ?? null;
  const nextId =
    currentId == null ? null : nextSectionId(ordered, fields, currentId, answers);

  // questions on the pages already passed, so numbering follows the path
  // instead of jumping over skipped sections
  const passed = new Set(path.slice(0, -1));
  const questionsBefore = fields.filter(
    (f) => f.section_id != null && passed.has(f.section_id)
  ).length;

  /** Puts back a saved path; it is trusted only as far as it still holds. */
  const restore = useCallback((saved: number[]) => setHistory(saved), []);

  return {
    path,
    current,
    questionsBefore,
    // no next section: this page gets Submit instead of Next
    isLast: nextId == null,
    canGoBack: path.length > 1,
    goNext: () => {
      if (nextId != null) setHistory([...path, nextId]);
    },
    goBack: () => {
      if (path.length > 1) setHistory(path.slice(0, -1));
    },
    /** Back to the first page (answers are kept). */
    reset: () => setHistory([]),
    restore,
  };
}
