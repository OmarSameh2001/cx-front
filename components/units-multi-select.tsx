"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ChevronDown } from "lucide-react";
import type { LookupResult } from "@/dto/lookup/lookup";
import { LookupService } from "@/services/lookup/lookup";

const lookupService = new LookupService();

export function UnitsMultiSelect({
  value,
  onChange,
  excludeIds = [],
}: {
  value: LookupResult[];
  onChange: (next: LookupResult[]) => void;
  excludeIds?: number[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<LookupResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setResults([]);
      setSearch("");
      return;
    }
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

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);
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

  const visibleResults = results.filter((u) => !excludeSet.has(u.id));

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
              {!loading && visibleResults.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  No units found.
                </li>
              )}
              {!loading &&
                visibleResults.map((u) => {
                  const checked = selectedIds.has(u.id);
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => toggle(u)}
                        className={[
                          "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground",
                          checked ? "bg-accent/60 text-accent-foreground" : "",
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
