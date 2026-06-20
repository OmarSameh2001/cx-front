"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Table from "@/components/table/table";
import type { SortState } from "@/dto/table/table";
import { FormService } from "@/services/form/form";
import { SubmissionService } from "@/services/submission/submission";
import type { FormRead } from "@/dto/form/form";
import type { SubmissionRead } from "@/dto/submission/submission";
import { showErrorToast } from "@/utils/toaster/toaster";

const formService = new FormService();
const submissionService = new SubmissionService();

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "in_progress", label: "In progress" },
  { value: "submitted", label: "Submitted" },
  { value: "late", label: "Late" },
  { value: "expired", label: "Expired" },
];

const COLUMNS = [
  { key: "id", name: "#", type: "text" },
  { key: "submitter_name", name: "Submitter", type: "text", sortable: false },
  { key: "status", name: "Status", type: "status" },
  { key: "attempt_number", name: "Attempt", type: "text" },
  { key: "score_display", name: "Score", type: "text" },
  { key: "started_at_display", name: "Started", type: "text" },
  { key: "submitted_at_display", name: "Submitted", type: "text" },
];

const SORT_KEY_MAP: Record<string, string> = {
  status: "status",
  attempt_number: "attempt_number",
  score_display: "score",
  started_at_display: "started_at",
  submitted_at_display: "submitted_at",
};

export default function FormSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [form, setForm] = useState<FormRead | null>(null);
  const [items, setItems] = useState<SubmissionRead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("");
  const [submitterSearch, setSubmitterSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "started_at_display", dir: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const reqId = useRef(0);

  useEffect(() => {
    formService.getById(Number(id)).then(setForm).catch(() => {});
  }, [id]);

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(submitterSearch), 350);
    return () => clearTimeout(t);
  }, [submitterSearch]);

  const fetchPage = useCallback(
    async (params: {
      page: number;
      limit: number;
      status: string;
      search: string;
      sortKey: string;
      sortDir: string;
    }) => {
      const thisReq = ++reqId.current;
      setLoading(true);
      try {
        const apiSortKey = SORT_KEY_MAP[params.sortKey] ?? "started_at";
        const res = await submissionService.list({
          form_id: Number(id),
          status_in: params.status || undefined,
          submitter_search: params.search || undefined,
          sort_by: apiSortKey,
          sort_dir: params.sortDir,
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
    fetchPage({
      page: currentPage,
      limit: itemsPerPage,
      status: statusFilter,
      search: debouncedSearch,
      sortKey: sort.key,
      sortDir: sort.dir,
    });
  }, [fetchPage, currentPage, itemsPerPage, statusFilter, debouncedSearch, sort]);

  function applyStatus(s: string) {
    setStatusFilter(s);
    setCurrentPage(1);
  }

  function handleSort(columnKey: string) {
    setSort((prev) =>
      prev.key === columnKey
        ? { key: columnKey, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key: columnKey, dir: "desc" }
    );
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const hasNextPage = currentPage < totalPages;

  const tableRows = useMemo(
    () =>
      items.map((sub) => ({
        ...sub,
        submitter_name: sub.submitter_name ?? "—",
        score_display: sub.score == null ? "—" : `${Math.round(sub.score)}/100`,
        started_at_display: formatDate(sub.started_at),
        submitted_at_display: sub.submitted_at ? formatDate(sub.submitted_at) : "—",
      })),
    [items]
  );

  return (
    <div className="flex-1 min-w-0 min-h-screen p-6 flex flex-col gap-6">
      <Link
        href={`/form/${id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to form
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search submitter..."
          value={submitterSearch}
          onChange={(e) => {
            setSubmitterSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-1.5 text-sm rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-[180px]"
        />
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
      </div>

      <Table
        name={form ? `${form.name} — Submissions` : "Submissions"}
        columns={COLUMNS}
        data={tableRows}
        loading={loading}
        query=""
        base="submissions"
        sort={sort}
        onSort={handleSort}
        actions={[
          { name: "view", onClick: (id) => router.push(`/submissions/${id}`), permission: "" },
        ]}
        pagination={{
          currentPage,
          setCurrentPage,
          totalPages,
          hasNextPage,
          itemsPerPage,
          setItemsPerPage: (n) => {
            setItemsPerPage(n);
            setCurrentPage(1);
          },
        }}
      />
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
