"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import Table from "@/components/table/table";
import { UnitsMultiSelect } from "@/components/units-multi-select";
import { EmployeeService } from "@/services/employee/employee";
import { LookupService } from "@/services/lookup/lookup";
import type {
  EmployeeCreate,
  EmployeeSummary,
  EmployeeUpdate,
} from "@/dto/employee/employee";
import type { LookupResult } from "@/dto/lookup/lookup";
import {
  showConfirmToast,
  showSuccessToast,
  showErrorToast,
} from "@/utils/toaster/toaster";

const employeeService = new EmployeeService();
const lookupService = new LookupService();

const COLUMNS = [
  { key: "id", name: "#", type: "text" },
  { key: "first_name", name: "First Name", type: "text" },
  { key: "last_name", name: "Last Name", type: "text" },
  { key: "username", name: "Username", type: "text" },
  { key: "email", name: "Email", type: "text" },
  { key: "role_display", name: "Role", type: "text" },
  { key: "unit_display", name: "Unit", type: "text" },
  { key: "is_active", name: "Status", type: "boolean" },
];

const EMPTY_CREATE: EmployeeCreate = {
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  password: "",
  is_active: true,
  role_id: null,
  unit_id: null,
  manager_id: null,
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [roles, setRoles] = useState<LookupResult[]>([]);
  const [units, setUnits] = useState<LookupResult[]>([]);
  const [lookupsLoaded, setLookupsLoaded] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<EmployeeCreate>(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EmployeeUpdate>({});
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [assignUnitsOpen, setAssignUnitsOpen] = useState(false);
  const [assignUnitsEmployee, setAssignUnitsEmployee] = useState<EmployeeSummary | null>(null);
  const [assignUnitsSelected, setAssignUnitsSelected] = useState<LookupResult[]>([]);
  const [assignUnitsSaving, setAssignUnitsSaving] = useState(false);


  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employeeService.list({
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      });
      setEmployees(res.items);
      setTotal(res.total);
    } catch {
      setError("Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  const ensureLookups = useCallback(async () => {
    if (lookupsLoaded) return;
    try {
      const [rolesRes, unitsRes] = await Promise.all([
        lookupService.roles(),
        lookupService.units(),
      ]);
      setRoles(rolesRes);
      setUnits(unitsRes);
      setLookupsLoaded(true);
    } catch {
      // non-critical; form selects will just be empty
    }
  }, [lookupsLoaded]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      await employeeService.create(createForm);
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      fetchEmployees();
    } catch {
      setCreateError("Failed to create employee.");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(id: number, row: EmployeeSummary) {
    setEditId(id);
    setEditForm({
      first_name: row.first_name,
      last_name: row.last_name,
      username: row.username,
      email: row.email,
      is_active: row.is_active,
      role_id: row.role_id ?? null,
      unit_id: row.unit_id ?? null,
    });
    setEditOpen(true);
    setEditError(null);
    ensureLookups();
  }

  async function handleUpdate() {
    if (editId === null) return;
    setUpdating(true);
    setEditError(null);
    try {
      await employeeService.update(editId, editForm);
      setEditOpen(false);
      fetchEmployees();
    } catch {
      setEditError("Failed to update employee.");
    } finally {
      setUpdating(false);
    }
  }

  async function openAssignUnits(employee: EmployeeSummary) {
    setAssignUnitsEmployee(employee);
    setAssignUnitsOpen(true);
    try {
      const allUnits = await lookupService.units();
      const assignedSet = new Set(employee.assigned_units);
      const excluded = employee.unit_id ?? -1;
      setAssignUnitsSelected(
        allUnits.filter((u) => assignedSet.has(u.id) && u.id !== excluded)
      );
    } catch {
      setAssignUnitsSelected([]);
    }
  }

  async function handleSaveAssignedUnits() {
    if (!assignUnitsEmployee) return;
    setAssignUnitsSaving(true);
    try {
      await employeeService.update(assignUnitsEmployee.id, {
        assigned_units: assignUnitsSelected.map((u) => u.id),
      });
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === assignUnitsEmployee.id
            ? { ...e, assigned_units: assignUnitsSelected.map((u) => u.id) }
            : e
        )
      );
      setAssignUnitsOpen(false);
      showSuccessToast("Assigned units updated.");
    } catch {
      showErrorToast("Failed to update assigned units.");
    } finally {
      setAssignUnitsSaving(false);
    }
  }

  function handleDelete(id: number) {
    showConfirmToast({
      title: "Delete employee",
      message: "Are you sure you want to delete this employee?",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await employeeService.remove(id);
          showSuccessToast("Employee deleted.");
          fetchEmployees();
        } catch {
          showErrorToast("Failed to delete employee.");
        }
      },
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const hasNextPage = currentPage < totalPages;

  const tableRows = useMemo(
    () =>
      employees.map((e) => ({
        ...e,
        role_display: e.role_id ? `${e.role_name ?? "—"}` : "—",
        unit_display: e.unit_id ? `${e.unit_name ?? "—"}` : "—",
      })),
    [employees]
  );

  return (
    <div className="flex-1 min-w-0 min-h-screen p-6">
      {error && <p className="mb-4 text-red-600 text-sm">{error}</p>}

      <Table
        name="Employees"
        columns={COLUMNS}
        data={tableRows}
        loading={loading}
        query=""
        base="employees"
        addNew={() => {
          setCreateForm(EMPTY_CREATE);
          setCreateError(null);
          setCreateOpen(true);
          ensureLookups();
        }}
        addNewPermission="employees:create"
        buttonName="Add Employee"
        actions={[
          { name: "edit", onClick: (id, row) => openEdit(id, row as EmployeeSummary), permission: "employees:update" },
          { name: "select", onClick: (_id, row) => openAssignUnits(row as EmployeeSummary), permission: "employees:update" },
          { name: "delete", onClick: (id) => handleDelete(id), permission: "employees:delete" },
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

      {/* Create modal */}
      {createOpen && (
        <Modal title="Add Employee" onClose={() => setCreateOpen(false)}>
          <EmployeeForm
            values={createForm}
            onChange={setCreateForm}
            roles={roles}
            units={units}
            showPassword
            error={createError}
            submitting={creating}
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            submitLabel="Create"
          />
        </Modal>
      )}

      {/* Edit modal */}
      {editOpen && (
        <Modal title="Edit Employee" onClose={() => setEditOpen(false)}>
          <EmployeeForm
            values={editForm}
            onChange={setEditForm}
            roles={roles}
            units={units}
            showPassword={false}
            error={editError}
            submitting={updating}
            onSubmit={handleUpdate}
            onCancel={() => setEditOpen(false)}
            submitLabel="Save"
          />
        </Modal>
      )}

      {/* Assign units modal */}
      {assignUnitsOpen && assignUnitsEmployee && (
        <Modal
          title={`Assign Units — ${assignUnitsEmployee.first_name} ${assignUnitsEmployee.last_name}`}
          onClose={() => setAssignUnitsOpen(false)}
        >
          <div className="space-y-4 px-6 pb-6 pt-2">
            <p className="text-sm text-muted-foreground">
              Select which units this employee can access. Their home unit is not shown here.
            </p>
            <UnitsMultiSelect
              value={assignUnitsSelected}
              onChange={setAssignUnitsSelected}
              excludeIds={assignUnitsEmployee.unit_id ? [assignUnitsEmployee.unit_id] : []}
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setAssignUnitsOpen(false)}
                className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssignedUnits}
                disabled={assignUnitsSaving}
                className="px-4 py-2 rounded bg-blue-700 text-white text-sm hover:bg-blue-800 disabled:opacity-50"
              >
                {assignUnitsSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
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

type FormValues = EmployeeCreate | EmployeeUpdate;

function EmployeeForm({
  values,
  onChange,
  roles,
  units,
  showPassword,
  error,
  submitting,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  values: FormValues;
  onChange: (v: any) => void;
  roles: LookupResult[];
  units: LookupResult[];
  showPassword: boolean;
  error: string | null;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  function set(field: string, value: unknown) {
    onChange({ ...values, [field]: value });
  }

  const v = values as Record<string, any>;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="First Name">
          <input
            type="text"
            value={v.first_name ?? ""}
            onChange={(e) => set("first_name", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Last Name">
          <input
            type="text"
            value={v.last_name ?? ""}
            onChange={(e) => set("last_name", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Username">
          <input
            type="text"
            value={v.username ?? ""}
            onChange={(e) => set("username", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={v.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            className={inputCls}
          />
        </Field>
        {showPassword && (
          <Field label="Password" className="sm:col-span-2">
            <input
              type="password"
              value={v.password ?? ""}
              onChange={(e) => set("password", e.target.value)}
              className={inputCls}
            />
          </Field>
        )}
        <Field label="Role">
          <select
            value={v.role_id ?? ""}
            onChange={(e) =>
              set("role_id", e.target.value ? Number(e.target.value) : null)
            }
            className={inputCls}
          >
            <option value="">No Role</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unit">
          <select
            value={v.unit_id ?? ""}
            onChange={(e) =>
              set("unit_id", e.target.value ? Number(e.target.value) : null)
            }
            className={inputCls}
          >
            <option value="">No Unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="emp-is-active"
            checked={v.is_active ?? true}
            onChange={(e) => set("is_active", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-blue-600"
          />
          <label
            htmlFor="emp-is-active"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Active
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

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
