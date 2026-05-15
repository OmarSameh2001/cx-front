"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SubmissionService } from "@/services/submission/submission";
import type { SubmissionRead } from "@/dto/submission/submission";
import { showErrorToast } from "@/utils/toaster/toaster";

const submissionService = new SubmissionService();

const STATUS_TONE: Record<string, string> = {
  in_progress: "bg-muted text-muted-foreground border-border",
  submitted: "bg-primary/10 text-primary border-primary/40",
  late: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/40",
  expired: "bg-destructive/10 text-destructive border-destructive/40",
};

export default function MySubmissionsPage() {
  const params = useSearchParams();
  const formId = params.get("form_id");

  const [items, setItems] = useState<SubmissionRead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    submissionService
      .listMine({
        limit: 100,
        form_id: formId ? Number(formId) : undefined,
      })
      .then((page) => {
        if (!cancelled) setItems(page.items);
      })
      .catch(() => {
        if (!cancelled) showErrorToast("Could not load submissions");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formId]);

  return (
    <div className="flex-1 min-h-screen bg-muted/40">
      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold text-foreground">
            My submissions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every attempt you&apos;ve started, with its current status.
          </p>
        </header>

        <div className="rounded-lg bg-card text-card-foreground border border-border overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs text-muted-foreground uppercase">
                <th className="px-4 py-2">Form #</th>
                <th className="px-4 py-2">Attempt</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Started</th>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    No submissions yet.
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-2">{s.form_id}</td>
                    <td className="px-4 py-2">{s.attempt_number}</td>
                    <td className="px-4 py-2">
                      <span
                        className={[
                          "text-xs px-2 py-0.5 rounded-full border",
                          STATUS_TONE[s.status] ?? "",
                        ].join(" ")}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">{formatDate(s.started_at)}</td>
                    <td className="px-4 py-2">
                      {s.submitted_at ? formatDate(s.submitted_at) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {s.score == null ? "—" : s.score}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/submissions/${s.id}`}
                        className="text-primary hover:underline text-xs font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}
