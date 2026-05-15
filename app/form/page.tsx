"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Eye, Search, ClipboardList } from "lucide-react";
import { FormService } from "@/services/form/form";
import { useAuth } from "@/app/_providers/auth-provider";
import type { FormSummary } from "@/dto/form/form";

const formService = new FormService();
const PAGE_SIZES = [10, 25, 50, 100];

type ScopeFilter = "all" | "mine" | "my_units";
type StatusFilter = "all" | "active" | "inactive" | "archived";

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
        // listAssignedToMe always filters by employee principal server-side;
        // apply the submitter filter client-side on the returned page
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

  function handlePageSizeChange(newSize: number) {
    const firstItem = (currentPage - 1) * itemsPerPage;
    setCurrentPage(Math.max(1, Math.floor(firstItem / newSize) + 1));
    setItemsPerPage(newSize);
  }

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  return (
    <div className="flex-1 min-h-screen bg-muted/40">
      <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Forms</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and create forms.
            </p>
          </div>
          <Link
            href="/form/create"
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 shadow-sm text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Create form
          </Link>
        </header>

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

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="rounded-lg bg-card border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm">
              <thead className="text-xs font-semibold uppercase text-muted-foreground bg-muted">
                <tr>
                  <th className="p-3 text-left whitespace-nowrap">#</th>
                  <th className="p-3 text-left whitespace-nowrap">Name</th>
                  <th className="p-3 text-left whitespace-nowrap">Type</th>
                  <th className="p-3 text-left whitespace-nowrap">Submitters</th>
                  <th className="p-3 text-left whitespace-nowrap">Status</th>
                  <th className="p-3 text-left whitespace-nowrap">Created</th>
                  <th className="p-3 text-left whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      No forms found.
                    </td>
                  </tr>
                ) : (
                  items.map((form, idx) => (
                    <tr
                      key={form.id}
                      className="border-t border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <td className="p-3 text-muted-foreground">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="p-3 font-medium">{form.name}</td>
                      <td className="p-3 capitalize">{form.type}</td>
                      <td className="p-3 capitalize">
                        {form.submitter_type.join(", ")}
                      </td>
                      <td className="p-3">
                        <StatusBadge form={form} />
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(form.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => router.push(`/form/${form.id}`)}
                            className="text-primary hover:opacity-70"
                            title="Edit form"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/form/${form.id}/submissions`)}
                            className="text-muted-foreground hover:text-foreground"
                            title="View submissions"
                          >
                            <ClipboardList className="h-4 w-4" />
                          </button>
                        </div>
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
                  ? "0 forms"
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

function statusToFlags(status: StatusFilter): { active: boolean | undefined; archived: boolean | undefined } {
  if (status === "active") return { active: true, archived: false };
  if (status === "inactive") return { active: false, archived: false };
  if (status === "archived") return { active: undefined, archived: true };
  return { active: undefined, archived: undefined };
}

function StatusBadge({ form }: { form: FormSummary }) {
  if (form.is_archived)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
        Archived
      </span>
    );
  if (!form.is_active)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        Inactive
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
      Active
    </span>
  );
}
