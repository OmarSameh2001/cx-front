"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye } from "lucide-react";
import { FormService } from "@/services/form/form";
import { SubmissionService } from "@/services/submission/submission";
import type { FormRead } from "@/dto/form/form";
import type { SubmissionRead, SubmissionStatus } from "@/dto/submission/submission";
import { showErrorToast } from "@/utils/toaster/toaster";

const formService = new FormService();
const submissionService = new SubmissionService();

const PAGE_SIZES = [10, 25, 50];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "in_progress", label: "In progress" },
  { value: "submitted", label: "Submitted" },
  { value: "late", label: "Late" },
  { value: "expired", label: "Expired" },
];

const STATUS_TONE: Record<SubmissionStatus, string> = {
  in_progress: "bg-muted text-muted-foreground border-border",
  submitted: "bg-primary/10 text-primary border-primary/40",
  late: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/40",
  expired: "bg-destructive/10 text-destructive border-destructive/40",
};

export default function FormSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [form, setForm] = useState<FormRead | null>(null);
  const [items, setItems] = useState<SubmissionRead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const reqId = useRef(0);

  useEffect(() => {
    formService
      .getById(Number(id))
      .then(setForm)
      .catch(() => {});
  }, [id]);

  const fetchPage = useCallback(
    async (params: {
      page: number;
      limit: number;
      status: string;
    }) => {
      const thisReq = ++reqId.current;
      setLoading(true);
      try {
        const res = await submissionService.list({
          form_id: Number(id),
          status_in: params.status || undefined,
          limit: params.limit,
          offset: (params.page - 1) * params.limit,
        });
        if (thisReq !== reqId.current) return;
        setItems(res.items);
        setTotal(res.total);
      } catch (e) {
        if (thisReq !== reqId.current) return;
        showErrorToast(e instanceof Error ? e.message : "Failed to load submissions");
      } finally {
        if (thisReq !== reqId.current) return;
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchPage({ page: currentPage, limit: itemsPerPage, status: statusFilter });
  }, [fetchPage, currentPage, itemsPerPage, statusFilter]);

  function applyStatus(s: string) {
    setStatusFilter(s);
    setCurrentPage(1);
  }

  function handlePageSizeChange(newSize: number) {
    const firstItem = (currentPage - 1) * itemsPerPage;
    setCurrentPage(Math.max(1, Math.floor(firstItem / newSize) + 1));
    setItemsPerPage(newSize);
  }

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  return (
    <div className="flex-1 min-h-screen bg-muted/40">
      <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-6">
        <Link
          href={`/form/${id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to form
        </Link>

        <header className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {form ? form.name : "Form"} — Submissions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {total} submission{total !== 1 ? "s" : ""} total
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => applyStatus(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </header>

        <div className="rounded-lg bg-card border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm">
              <thead className="text-xs font-semibold uppercase text-muted-foreground bg-muted">
                <tr>
                  <th className="p-3 text-left whitespace-nowrap">#</th>
                  <th className="p-3 text-left whitespace-nowrap">Submitter</th>
                  <th className="p-3 text-left whitespace-nowrap">Status</th>
                  <th className="p-3 text-left whitespace-nowrap">Attempt</th>
                  <th className="p-3 text-left whitespace-nowrap">Score</th>
                  <th className="p-3 text-left whitespace-nowrap">Started</th>
                  <th className="p-3 text-left whitespace-nowrap">Submitted</th>
                  <th className="p-3 text-left whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No submissions yet.
                    </td>
                  </tr>
                ) : (
                  items.map((sub, idx) => (
                    <tr
                      key={sub.id}
                      className="border-t border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <td className="p-3 text-muted-foreground">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {sub.user_id != null
                          ? `Employee #${sub.user_id}`
                          : sub.customer_id != null
                          ? `Customer #${sub.customer_id}`
                          : "—"}
                      </td>
                      <td className="p-3">
                        <span
                          className={[
                            "px-2 py-0.5 rounded-full text-xs border",
                            STATUS_TONE[sub.status],
                          ].join(" ")}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">{sub.attempt_number}</td>
                      <td className="p-3">
                        {sub.score == null ? "—" : sub.score}
                      </td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {formatDate(sub.started_at)}
                      </td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {sub.submitted_at ? formatDate(sub.submitted_at) : "—"}
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/submissions/${sub.id}`}
                          className="text-primary hover:opacity-70"
                          title="View detail"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              {PAGE_SIZES.map((n) => (
                <button
                  key={n}
                  onClick={() => handlePageSizeChange(n)}
                  className={`px-2 py-0.5 rounded border text-xs ${
                    itemsPerPage === n
                      ? "border-primary text-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span>
                {total === 0
                  ? "0 submissions"
                  : `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(
                      currentPage * itemsPerPage,
                      total
                    )} of ${total}`}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="px-2 py-1 rounded border border-border disabled:opacity-40 hover:bg-accent"
              >
                Prev
              </button>
              <span>{currentPage} / {totalPages}</span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages || loading}
                className="px-2 py-1 rounded border border-border disabled:opacity-40 hover:bg-accent"
              >
                Next
              </button>
            </div>
          </div>
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
