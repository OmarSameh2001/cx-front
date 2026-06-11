"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, ChevronRight, ChevronDown, Building2 } from "lucide-react";
import Table from "@/components/table/table";
import { OrganisationService } from "@/services/organisation/organisation";
import { UnitService } from "@/services/unit/unit";
import { useAuth } from "@/app/_providers/auth-provider";
import { PermissionGate } from "@/components/protection/authorization";
import {
  showErrorToast,
  showSuccessToast,
  showConfirmToast,
} from "@/utils/toaster/toaster";
import type {
  OrganisationCreate,
  OrganisationSummary,
  OrganisationUpdate,
} from "@/dto/organisation/organisation";
import type { UnitCreate, UnitSummary, UnitUpdate } from "@/dto/unit/unit";

const orgService = new OrganisationService();
const unitService = new UnitService();

// ─── Organisations columns ───────────────────────────────────────────────────

const ORG_COLUMNS = [
  { key: "id", name: "#", type: "text" },
  { key: "name", name: "Name", type: "text" },
  { key: "industry", name: "Industry", type: "text" },
  { key: "subscription_end", name: "Subscription End", type: "text" },
];

const EMPTY_ORG_CREATE: OrganisationCreate = { name: "" };

// ─── Units tree helpers ──────────────────────────────────────────────────────

type UnitNode = UnitSummary & { children: UnitNode[] };

function buildTree(units: UnitSummary[]): UnitNode[] {
  const map = new Map<number, UnitNode>();
  units.forEach((u) => map.set(u.id, { ...u, children: [] }));
  const roots: UnitNode[] = [];
  units.forEach((u) => {
    if (u.parent_unit_id !== null && map.has(u.parent_unit_id)) {
      map.get(u.parent_unit_id)!.children.push(map.get(u.id)!);
    } else {
      roots.push(map.get(u.id)!);
    }
  });
  return roots;
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function OrganisationPage() {
  const { permissions, isAdmin } = useAuth();

  const canReadOrg = isAdmin || !!permissions["organisations:read"];
  const canReadUnit = isAdmin || !!permissions["units:read"];

  // ── Org list state ────────────────────────────────────────────────────────
  const [orgs, setOrgs] = useState<OrganisationSummary[]>([]);
  const [orgTotal, setOrgTotal] = useState(0);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgPage, setOrgPage] = useState(1);
  const [orgPerPage, setOrgPerPage] = useState(10);

  const [selectedOrg, setSelectedOrg] = useState<OrganisationSummary | null>(null);

  // ── Org create/edit state ─────────────────────────────────────────────────
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [createOrgForm, setCreateOrgForm] =
    useState<OrganisationCreate>(EMPTY_ORG_CREATE);
  const [creatingOrg, setCreatingOrg] = useState(false);

  const [editOrgOpen, setEditOrgOpen] = useState(false);
  const [editOrgId, setEditOrgId] = useState<number | null>(null);
  const [editOrgForm, setEditOrgForm] = useState<OrganisationUpdate>({});
  const [updatingOrg, setUpdatingOrg] = useState(false);

  // ── Units state ───────────────────────────────────────────────────────────
  const [units, setUnits] = useState<UnitSummary[]>([]);
  const [unitTotal, setUnitTotal] = useState(0);
  const [unitLoading, setUnitLoading] = useState(false);
  const [unitTab, setUnitTab] = useState<"tree" | "list">("tree");
  const [unitPage, setUnitPage] = useState(1);
  const [unitPerPage, setUnitPerPage] = useState(10);

  const [createUnitOpen, setCreateUnitOpen] = useState(false);
  const [createUnitForm, setCreateUnitForm] = useState<UnitCreate>({
    name: "",
    organisation_id: 0,
  });
  const [creatingUnit, setCreatingUnit] = useState(false);

  const [editUnitOpen, setEditUnitOpen] = useState(false);
  const [editUnitId, setEditUnitId] = useState<number | null>(null);
  const [editUnitForm, setEditUnitForm] = useState<UnitUpdate>({});
  const [updatingUnit, setUpdatingUnit] = useState(false);

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchOrgs = useCallback(async () => {
    if (!canReadOrg) return;
    setOrgLoading(true);
    try {
      const res = await orgService.list({
        limit: orgPerPage,
        offset: (orgPage - 1) * orgPerPage,
      });
      setOrgs(res.items);
      setOrgTotal(res.total);
    } catch {
      showErrorToast("Failed to load organisations.");
    } finally {
      setOrgLoading(false);
    }
  }, [canReadOrg, orgPage, orgPerPage]);

  const fetchUnits = useCallback(async () => {
    if (!selectedOrg || !canReadUnit) return;
    setUnitLoading(true);
    try {
      const res = await unitService.list(selectedOrg.id, { limit: 500 });
      setUnits(res.items);
      setUnitTotal(res.total);
    } catch {
      showErrorToast("Failed to load units.");
    } finally {
      setUnitLoading(false);
    }
  }, [selectedOrg, canReadUnit]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  useEffect(() => {
    fetchUnits();
    setUnitPage(1);
  }, [fetchUnits]);

  // ── Org handlers ──────────────────────────────────────────────────────────
  async function handleCreateOrg() {
    if (!createOrgForm.name.trim()) {
      showErrorToast("Name is required.");
      return;
    }
    setCreatingOrg(true);
    try {
      await orgService.create(createOrgForm);
      showSuccessToast("Organisation created.");
      setCreateOrgOpen(false);
      setCreateOrgForm(EMPTY_ORG_CREATE);
      fetchOrgs();
    } catch {
      showErrorToast("Failed to create organisation.");
    } finally {
      setCreatingOrg(false);
    }
  }

  function openEditOrg(id: number, row: OrganisationSummary) {
    setEditOrgId(id);
    setEditOrgForm({
      name: row.name,
      industry: row.industry ?? undefined,
      subscription_end: row.subscription_end ?? undefined,
    });
    setEditOrgOpen(true);
  }

  async function handleUpdateOrg() {
    if (editOrgId === null) return;
    setUpdatingOrg(true);
    try {
      await orgService.update(editOrgId, editOrgForm);
      showSuccessToast("Organisation updated.");
      setEditOrgOpen(false);
      if (selectedOrg?.id === editOrgId) {
        setSelectedOrg((prev) =>
          prev ? { ...prev, ...(editOrgForm as Partial<OrganisationSummary>) } : prev
        );
      }
      fetchOrgs();
    } catch {
      showErrorToast("Failed to update organisation.");
    } finally {
      setUpdatingOrg(false);
    }
  }

  function confirmDeleteOrg(id: number, row: OrganisationSummary) {
    showConfirmToast({
      title: "Delete organisation",
      message: `Delete "${row.name}"? This cannot be undone.`,
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await orgService.remove(id);
          showSuccessToast("Organisation deleted.");
          if (selectedOrg?.id === id) setSelectedOrg(null);
          fetchOrgs();
        } catch {
          showErrorToast("Failed to delete organisation.");
        }
      },
    });
  }

  // ── Unit handlers ─────────────────────────────────────────────────────────
  function openCreateUnit() {
    if (!selectedOrg) return;
    setCreateUnitForm({ name: "", organisation_id: selectedOrg.id });
    setCreateUnitOpen(true);
  }

  async function handleCreateUnit() {
    if (!createUnitForm.name.trim()) {
      showErrorToast("Name is required.");
      return;
    }
    setCreatingUnit(true);
    try {
      await unitService.create(createUnitForm);
      showSuccessToast("Unit created.");
      setCreateUnitOpen(false);
      fetchUnits();
    } catch {
      showErrorToast("Failed to create unit.");
    } finally {
      setCreatingUnit(false);
    }
  }

  function openEditUnit(id: number, row: UnitSummary) {
    setEditUnitId(id);
    setEditUnitForm({
      name: row.name,
      type: row.type ?? undefined,
      is_active: row.is_active,
      parent_unit_id: row.parent_unit_id ?? undefined,
    });
    setEditUnitOpen(true);
  }

  async function handleUpdateUnit() {
    if (editUnitId === null || !selectedOrg) return;
    setUpdatingUnit(true);
    try {
      await unitService.update(editUnitId, selectedOrg.id, editUnitForm);
      showSuccessToast("Unit updated.");
      setEditUnitOpen(false);
      fetchUnits();
    } catch {
      showErrorToast("Failed to update unit.");
    } finally {
      setUpdatingUnit(false);
    }
  }

  function confirmDeleteUnit(id: number, row: UnitSummary) {
    showConfirmToast({
      title: "Delete unit",
      message: `Delete unit "${row.name}"?`,
      confirmText: "Delete",
      onConfirm: async () => {
        if (!selectedOrg) return;
        try {
          await unitService.remove(id, selectedOrg.id);
          showSuccessToast("Unit deleted.");
          fetchUnits();
        } catch {
          showErrorToast("Failed to delete unit.");
        }
      },
    });
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const orgTotalPages = Math.max(1, Math.ceil(orgTotal / orgPerPage));

  const orgTableData = orgs.map((o) => ({
    ...o,
    industry: o.industry ?? "—",
    subscription_end: o.subscription_end ?? "—",
  }));

  const unitTree = useMemo(() => buildTree(units), [units]);

  const UNIT_COLUMNS = [
    { key: "id", name: "#", type: "text" },
    { key: "name", name: "Name", type: "text" },
    { key: "type", name: "Type", type: "text" },
    { key: "parent_name", name: "Parent", type: "text" },
    { key: "is_active", name: "Active", type: "boolean" },
  ];

  const unitIdToName = useMemo(() => {
    const m = new Map<number, string>();
    units.forEach((u) => m.set(u.id, u.name));
    return m;
  }, [units]);

  const unitTotalPages = Math.max(1, Math.ceil(unitTotal / unitPerPage));
  const unitTableData = useMemo(() => {
    const start = (unitPage - 1) * unitPerPage;
    return units.slice(start, start + unitPerPage).map((u) => ({
      ...u,
      type: u.type ?? "—",
      parent_name: u.parent_unit_id ? (unitIdToName.get(u.parent_unit_id) ?? "—") : "—",
    }));
  }, [units, unitPage, unitPerPage, unitIdToName]);

  const unitActions = [
    { name: "edit", onClick: (id: number, row: unknown) => openEditUnit(id, row as UnitSummary), permission: "units:update" },
    { name: "delete", onClick: (id: number, row: unknown) => confirmDeleteUnit(id, row as UnitSummary), permission: "units:delete" },
  ];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 min-w-0 min-h-screen p-6 flex flex-col gap-6">
      {/* Organisations table */}
      <Table
        name="Organisations"
        columns={ORG_COLUMNS}
        data={orgTableData}
        loading={orgLoading}
        query=""
        base="organisations"
        addNew={() => {
          setCreateOrgForm(EMPTY_ORG_CREATE);
          setCreateOrgOpen(true);
        }}
        addNewPermission="organisations:create"
        buttonName="Add Organisation"
        actions={[
          {
            name: "select",
            onClick: (_id, row) => {
              const org = row as OrganisationSummary;
              setSelectedOrg(org);
            },
            permission: "organisations:read",
          },
          { name: "edit", onClick: (id: number, row: unknown) => openEditOrg(id, row as OrganisationSummary), permission: "organisations:update" },
          { name: "delete", onClick: (id: number, row: unknown) => confirmDeleteOrg(id, row as OrganisationSummary), permission: "organisations:delete" },
        ]}
        pagination={{
          currentPage: orgPage,
          setCurrentPage: setOrgPage,
          totalPages: orgTotalPages,
          hasNextPage: orgPage < orgTotalPages,
          itemsPerPage: orgPerPage,
          setItemsPerPage: (n) => {
            setOrgPerPage(n);
            setOrgPage(1);
          },
        }}
      />

      {/* Units panel — shown when an org is selected */}
      {selectedOrg && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-gray-800 dark:text-gray-100">
                {selectedOrg.name}
              </span>
              <span className="text-sm text-gray-400 dark:text-gray-500">— Units</span>
            </div>
            <div className="flex items-center gap-3">
              <PermissionGate permission="units:create">
                <button
                  onClick={openCreateUnit}
                  className="px-3 py-1.5 rounded bg-blue-700 text-white text-sm hover:bg-blue-800"
                >
                  + Add Unit
                </button>
              </PermissionGate>
              <button
                onClick={() => setSelectedOrg(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-0 border-b border-gray-100 dark:border-gray-700 px-5">
            <TabButton active={unitTab === "tree"} onClick={() => setUnitTab("tree")}>
              Tree
            </TabButton>
            <TabButton active={unitTab === "list"} onClick={() => setUnitTab("list")}>
              List
            </TabButton>
          </div>

          <div className="p-4">
            {unitLoading ? (
              <p className="text-sm text-gray-400 py-6 text-center">Loading units…</p>
            ) : units.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">
                No units yet.{" "}
                <PermissionGate permission="units:create">
                  <button
                    onClick={openCreateUnit}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Add the first one.
                  </button>
                </PermissionGate>
              </p>
            ) : unitTab === "tree" ? (
              <div className="overflow-x-auto">
                <UnitTree
                  nodes={unitTree}
                  onEdit={openEditUnit}
                  onDelete={confirmDeleteUnit}
                />
              </div>
            ) : (
              <Table
                name=""
                columns={UNIT_COLUMNS}
                data={unitTableData}
                loading={false}
                query=""
                base="units"
                addNew={openCreateUnit}
                addNewPermission="units:create"
                buttonName="Add Unit"
                actions={unitActions}
                pagination={{
                  currentPage: unitPage,
                  setCurrentPage: setUnitPage,
                  totalPages: unitTotalPages,
                  hasNextPage: unitPage < unitTotalPages,
                  itemsPerPage: unitPerPage,
                  setItemsPerPage: (n) => {
                    setUnitPerPage(n);
                    setUnitPage(1);
                  },
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Org modals ── */}
      {createOrgOpen && (
        <Modal title="Add Organisation" onClose={() => setCreateOrgOpen(false)}>
          <OrgForm
            values={createOrgForm}
            onChange={setCreateOrgForm}
            onSubmit={handleCreateOrg}
            onCancel={() => setCreateOrgOpen(false)}
            submitting={creatingOrg}
            submitLabel="Create"
          />
        </Modal>
      )}

      {editOrgOpen && (
        <Modal title="Edit Organisation" onClose={() => setEditOrgOpen(false)}>
          <OrgForm
            values={editOrgForm}
            onChange={setEditOrgForm}
            onSubmit={handleUpdateOrg}
            onCancel={() => setEditOrgOpen(false)}
            submitting={updatingOrg}
            submitLabel="Save"
          />
        </Modal>
      )}

      {/* ── Unit modals ── */}
      {createUnitOpen && selectedOrg && (
        <Modal title="Add Unit" onClose={() => setCreateUnitOpen(false)}>
          <UnitForm
            values={createUnitForm}
            onChange={setCreateUnitForm}
            units={units}
            onSubmit={handleCreateUnit}
            onCancel={() => setCreateUnitOpen(false)}
            submitting={creatingUnit}
            submitLabel="Create"
          />
        </Modal>
      )}

      {editUnitOpen && (
        <Modal title="Edit Unit" onClose={() => setEditUnitOpen(false)}>
          <UnitForm
            values={editUnitForm}
            onChange={setEditUnitForm}
            units={units.filter((u) => u.id !== editUnitId)}
            onSubmit={handleUpdateUnit}
            onCancel={() => setEditUnitOpen(false)}
            submitting={updatingUnit}
            submitLabel="Save"
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Tree component ──────────────────────────────────────────────────────────

function UnitTree({
  nodes,
  depth = 0,
  onEdit,
  onDelete,
}: {
  nodes: UnitNode[];
  depth?: number;
  onEdit: (id: number, row: UnitSummary) => void;
  onDelete: (id: number, row: UnitSummary) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => (
        <UnitTreeNode
          key={node.id}
          node={node}
          depth={depth}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

function UnitTreeNode({
  node,
  depth,
  onEdit,
  onDelete,
}: {
  node: UnitNode;
  depth: number;
  onEdit: (id: number, row: UnitSummary) => void;
  onDelete: (id: number, row: UnitSummary) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div
        className="flex items-center gap-1 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 group"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 w-4 h-4 flex items-center justify-center text-gray-400"
        >
          {hasChildren ? (
            open ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : (
            <span className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 inline-block" />
          )}
        </button>

        <span className="flex-1 text-sm text-gray-800 dark:text-gray-100 truncate">
          {node.name}
        </span>

        {node.type && (
          <span className="text-xs text-gray-400 dark:text-gray-500 mr-2 hidden sm:block">
            {node.type}
          </span>
        )}

        <span
          className={`text-xs px-1.5 py-0.5 rounded-full mr-1 ${
            node.is_active
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
          }`}
        >
          {node.is_active ? "active" : "inactive"}
        </span>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <PermissionGate permission="units:update">
            <button
              onClick={() => onEdit(node.id, node)}
              className="px-2 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Edit
            </button>
          </PermissionGate>
          <PermissionGate permission="units:delete">
            <button
              onClick={() => onDelete(node.id, node)}
              className="px-2 py-0.5 text-xs rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
          </PermissionGate>
        </div>
      </div>

      {hasChildren && open && (
        <UnitTree
          nodes={node.children}
          depth={depth + 1}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </li>
  );
}

// ─── Org form ────────────────────────────────────────────────────────────────

function OrgForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}: {
  values: OrganisationCreate | OrganisationUpdate;
  onChange: (v: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const v = values as Record<string, any>;
  function set(field: string, value: unknown) {
    onChange({ ...values, [field]: value });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Name *" className="sm:col-span-2">
          <input
            type="text"
            value={v.name ?? ""}
            onChange={(e) => set("name", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Industry">
          <input
            type="text"
            value={v.industry ?? ""}
            onChange={(e) => set("industry", e.target.value || null)}
            className={inputCls}
          />
        </Field>
        <Field label="Subscription End">
          <input
            type="date"
            value={v.subscription_end ?? ""}
            onChange={(e) => set("subscription_end", e.target.value || null)}
            className={inputCls}
          />
        </Field>
        <Field label="Contact Info" className="sm:col-span-2">
          <textarea
            rows={2}
            value={v.contact_info ?? ""}
            onChange={(e) => set("contact_info", e.target.value || null)}
            className={inputCls}
          />
        </Field>
      </div>
      <ModalActions
        onCancel={onCancel}
        onSubmit={onSubmit}
        submitting={submitting}
        submitLabel={submitLabel}
      />
    </div>
  );
}

// ─── Unit form ────────────────────────────────────────────────────────────────

function UnitForm({
  values,
  onChange,
  units,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}: {
  values: UnitCreate | UnitUpdate;
  onChange: (v: any) => void;
  units: UnitSummary[];
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const v = values as Record<string, any>;
  function set(field: string, value: unknown) {
    onChange({ ...values, [field]: value });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Name *" className="sm:col-span-2">
          <input
            type="text"
            value={v.name ?? ""}
            onChange={(e) => set("name", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Type">
          <input
            type="text"
            value={v.type ?? ""}
            onChange={(e) => set("type", e.target.value || null)}
            placeholder="e.g. Department"
            className={inputCls}
          />
        </Field>
        <Field label="Parent Unit">
          <select
            value={v.parent_unit_id ?? ""}
            onChange={(e) =>
              set("parent_unit_id", e.target.value ? Number(e.target.value) : null)
            }
            className={inputCls}
          >
            <option value="">None (root)</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Contact Info" className="sm:col-span-2">
          <textarea
            rows={2}
            value={v.contact_info ?? ""}
            onChange={(e) => set("contact_info", e.target.value || null)}
            className={inputCls}
          />
        </Field>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="unit-is-active"
            checked={v.is_active ?? true}
            onChange={(e) => set("is_active", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-blue-600"
          />
          <label
            htmlFor="unit-is-active"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Active
          </label>
        </div>
      </div>
      <ModalActions
        onCancel={onCancel}
        onSubmit={onSubmit}
        submitting={submitting}
        submitLabel={submitLabel}
      />
    </div>
  );
}

// ─── Shared UI primitives ────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-blue-700 text-blue-700 dark:text-blue-400 dark:border-blue-400"
          : "border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onSubmit,
  submitting,
  submitLabel,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button
        onClick={onCancel}
        className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        Cancel
      </button>
      <button
        onClick={onSubmit}
        disabled={submitting}
        className="px-4 py-2 rounded bg-blue-700 text-white text-sm hover:bg-blue-800 disabled:opacity-50"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
