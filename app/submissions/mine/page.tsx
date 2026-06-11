"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Table from "@/components/table/table";
import { SubmissionService } from "@/services/submission/submission";
import type { SubmissionRead } from "@/dto/submission/submission";
import { showErrorToast } from "@/utils/toaster/toaster";

const submissionService = new SubmissionService();

const COLUMNS = [
  { key: "id", name: "#", type: "text" },
  { key: "form_id", name: "Form #", type: "text" },
  { key: "attempt_number", name: "Attempt", type: "text" },
  { key: "status", name: "Status", type: "status" },
  { key: "started_at_display", name: "Started", type: "text" },
  { key: "submitted_at_display", name: "Submitted", type: "text" },
  { key: "score_display", name: "Score", type: "text" },
];

export default function MySubmissionsPage() {
  const params = useSearchParams();
  const formId = params.get("form_id");
  const router = useRouter();

  const [items, setItems] = useState<SubmissionRead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    submissionService
      .listMine({
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        form_id: formId ? Number(formId) : undefined,
      })
      .then((page) => {
        if (!cancelled) {
          setItems(page.items);
          setTotal(page.total);
        }
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
  }, [formId, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const hasNextPage = currentPage < totalPages;

  const tableRows = useMemo(
    () =>
      items.map((s) => ({
        ...s,
        started_at_display: formatDate(s.started_at),
        submitted_at_display: s.submitted_at ? formatDate(s.submitted_at) : "—",
        score_display: s.score == null ? "—" : String(s.score),
      })),
    [items]
  );

  return (
    <div className="flex-1 min-w-0 min-h-screen p-6">
      <Table
        name="My Submissions"
        columns={COLUMNS}
        data={tableRows}
        loading={loading}
        query=""
        base="submissions"
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
