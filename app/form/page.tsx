"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import Table from "@/components/table/table";
import { FormService } from "@/services/form/form";
import { useAuth } from "@/app/_providers/auth-provider";
import type { FormSummary } from "@/dto/form/form";

const formService = new FormService();

type ScopeFilter = "all" | "mine" | "my_units";
type StatusFilter = "all" | "active" | "inactive" | "archived";

const COLUMNS = [
  { key: "id", name: "#", type: "text" },
  { key: "name", name: "Name", type: "text" },
  { key: "type", name: "Type", type: "text" },
  { key: "submitter_type_display", name: "Submitters", type: "text" },
  { key: "status_display", name: "Status", type: "status" },
  { key: "created_at", name: "Created", type: "date" },
];

export default function FormListPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<FormSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nameQuery, setNameQuery] = useState("");
  const [formType, setFormType] = useState("");
  const [submitterFilter, setSubmitterFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const cache = useRef<Map<string, { items: FormSummary[]; total: number }>>(new Map());
  const reqId = useRef(0);

  const fetchPage = useCallback(
    async (params: {
      page: number;
      limit: number;
      name: string;
      formType: string;
      submitter: string;
      status: StatusFilter;
      scope: ScopeFilter;
    }) => {
      if (!user) return;

      const thisReq = ++reqId.current;
      const { active, archived } = statusToFlags(params.status);
      const key = JSON.stringify(params);
      const hit = cache.current.get(key);
      if (hit) {
        setItems(hit.items);
        setTotal(hit.total);
        return;
      }

      setLoading(true);
      setError(null);
      const offset = (params.page - 1) * params.limit;
      try {
        let res;
        if (params.scope === "my_units") {
          res = await formService.listAssignedToMe({
            name: params.name || undefined,
            form_type: params.formType || undefined,
            limit: params.limit,
            offset,
          });
        } else {
          res = await formService.list({
            name: params.name || undefined,
            form_type: params.formType || undefined,
            submitter_type: params.submitter || undefined,
            is_active: active,
            is_archived: archived,
            created_by: params.scope === "mine" ? user.id : undefined,
            limit: params.limit,
            offset,
          });
        }

        if (thisReq !== reqId.current) return;

        let fetchedItems = res.items as FormSummary[];
        if (params.scope === "my_units" && params.submitter) {
          fetchedItems = fetchedItems.filter((f) =>
            f.submitter_type.includes(params.submitter)
          );
        }

        const entry = { items: fetchedItems, total: res.total };
        cache.current.set(key, entry);
        setItems(entry.items);
        setTotal(entry.total);
      } catch {
        if (thisReq !== reqId.current) return;
        setError("Failed to load forms.");
      } finally {
        if (thisReq !== reqId.current) return;
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    fetchPage({ page: currentPage, limit: itemsPerPage, name: nameQuery, formType, submitter: submitterFilter, status: statusFilter, scope: scopeFilter });
  }, [fetchPage, currentPage, itemsPerPage, nameQuery, formType, submitterFilter, statusFilter, scopeFilter]);

  function applyFilter(change: Partial<{ nameQuery: string; formType: string; submitterFilter: string; statusFilter: StatusFilter; scopeFilter: ScopeFilter }>) {
    if (change.nameQuery !== undefined) setNameQuery(change.nameQuery);
    if (change.formType !== undefined) setFormType(change.formType);
    if (change.submitterFilter !== undefined) setSubmitterFilter(change.submitterFilter);
    if (change.statusFilter !== undefined) setStatusFilter(change.statusFilter);
    if (change.scopeFilter !== undefined) setScopeFilter(change.scopeFilter);
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const hasNextPage = currentPage < totalPages;

  const tableRows = useMemo(
    () =>
      items.map((form) => ({
        ...form,
        submitter_type_display: form.submitter_type.join(", "),
        status_display: form.is_archived ? "archived" : form.is_active ? "active" : "inactive",
      })),
    [items]
  );

  return (
    <div className="flex-1 min-w-0 min-h-screen p-6 flex flex-col gap-4">
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name..."
              value={nameQuery}
              onChange={(e) => applyFilter({ nameQuery: e.target.value })}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select
            value={formType}
            onChange={(e) => applyFilter({ formType: e.target.value })}
            className="px-3 py-1.5 text-sm rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All types</option>
            <option value="questionnaire">Questionnaire</option>
            <option value="exam">Exam</option>
          </select>
          <select
            value={submitterFilter}
            onChange={(e) => applyFilter({ submitterFilter: e.target.value })}
            className="px-3 py-1.5 text-sm rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All submitters</option>
            <option value="employee">Employee</option>
            <option value="customer">Customer</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => applyFilter({ statusFilter: e.target.value as StatusFilter })}
            className="px-3 py-1.5 text-sm rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={scopeFilter}
            onChange={(e) => applyFilter({ scopeFilter: e.target.value as ScopeFilter })}
            className="px-3 py-1.5 text-sm rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All forms</option>
            <option value="mine">Mine</option>
            <option value="my_units">My units</option>
          </select>
        </div>

        <Table
          name="Forms"
          columns={COLUMNS}
          data={tableRows}
          loading={loading}
          query=""
          base="form"
          addNew={() => router.push("/form/create")}
          addNewPermission="forms:create"
          buttonName="Create Form"
          actions={[
            { name: "view", onClick: (id) => router.push(`/form/${id}`), permission: "" },
            { name: "submissions", onClick: (id) => router.push(`/form/${id}/submissions`), permission: "" },
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

function statusToFlags(status: StatusFilter): { active: boolean | undefined; archived: boolean | undefined } {
  if (status === "active") return { active: true, archived: false };
  if (status === "inactive") return { active: false, archived: false };
  if (status === "archived") return { active: undefined, archived: true };
  return { active: undefined, archived: undefined };
}
