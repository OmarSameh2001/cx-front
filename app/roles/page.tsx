"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import Table from "@/components/table/table";
import { RoleService } from "@/services/role/role";
import {
  showErrorToast,
  showSuccessToast,
  showConfirmToast,
} from "@/utils/toaster/toaster";
import type {
  PermissionCreate,
  PermissionRead,
  RoleCreate,
  RoleRead,
  RoleSummary,
} from "@/dto/role/role";

const roleService = new RoleService();

const ROLE_COLUMNS = [
  { key: "id", name: "#", type: "text" },
  { key: "name", name: "Name", type: "text" },
  { key: "is_system", name: "System Role", type: "boolean" },
];

const PERMISSION_COLUMNS = [
  { key: "id", name: "#", type: "text" },
  { key: "resource", name: "Resource", type: "text" },
  { key: "action", name: "Action", type: "text" },
];

type Tab = "roles" | "permissions";

const EMPTY_ROLE: RoleCreate = {
  name: "",
  is_system: false,
  permission_ids: [],
};

const EMPTY_PERMISSION: PermissionCreate = {
  resource: "",
  action: "",
};

export default function RolesPage() {
  const [tab, setTab] = useState<Tab>("roles");

  // -------- Roles state --------
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [roleTotal, setRoleTotal] = useState(0);
  const [roleLoading, setRoleLoading] = useState(false);
  const [rolePage, setRolePage] = useState(1);
  const [rolePerPage, setRolePerPage] = useState(10);

  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [createRoleForm, setCreateRoleForm] = useState<RoleCreate>(EMPTY_ROLE);
  const [creatingRole, setCreatingRole] = useState(false);

  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editRoleId, setEditRoleId] = useState<number | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRolePerms, setEditRolePerms] = useState<number[]>([]);
  const [editRoleLoading, setEditRoleLoading] = useState(false);
  const [savingRole, setSavingRole] = useState(false);

  // -------- Permissions state --------
  const [permissions, setPermissions] = useState<PermissionRead[]>([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permPage, setPermPage] = useState(1);
  const [permPerPage, setPermPerPage] = useState(10);

  const [createPermOpen, setCreatePermOpen] = useState(false);
  const [createPermForm, setCreatePermForm] =
    useState<PermissionCreate>(EMPTY_PERMISSION);
  const [creatingPerm, setCreatingPerm] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // -------- Fetchers --------
  const fetchRoles = useCallback(async () => {
    setRoleLoading(true);
    try {
      const res = await roleService.list({
        limit: rolePerPage,
        offset: (rolePage - 1) * rolePerPage,
      });
      setRoles(res.items);
      setRoleTotal(res.total);
    } catch {
      showErrorToast("Failed to load roles.");
    } finally {
      setRoleLoading(false);
    }
  }, [rolePage, rolePerPage]);

  const fetchPermissions = useCallback(async () => {
    setPermLoading(true);
    try {
      const res = await roleService.listPermissions();
      setPermissions(res);
    } catch {
      showErrorToast("Failed to load permissions.");
    } finally {
      setPermLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // -------- Role handlers --------
  async function handleCreateRole() {
    if (!createRoleForm.name.trim()) {
      showErrorToast("Role name is required.");
      return;
    }
    setCreatingRole(true);
    try {
      await roleService.create(createRoleForm);
      showSuccessToast("Role created.");
      setCreateRoleOpen(false);
      setCreateRoleForm(EMPTY_ROLE);
      fetchRoles();
    } catch {
      showErrorToast("Failed to create role.");
    } finally {
      setCreatingRole(false);
    }
  }

  async function openEditRole(id: number) {
    setEditRoleId(id);
    setEditRoleOpen(true);
    setEditRoleLoading(true);
    try {
      const role = await roleService.getById(id);
      setEditRoleName(role.name);
      setEditRolePerms(role.permissions.map((p) => p.id));
    } catch {
      showErrorToast("Failed to load role.");
      setEditRoleOpen(false);
      setEditRoleId(null);
    } finally {
      setEditRoleLoading(false);
    }
  }

  async function handleSaveRole() {
    if (editRoleId === null) return;
    if (!editRoleName.trim()) {
      showErrorToast("Role name is required.");
      return;
    }
    setSavingRole(true);
    try {
      const current = await roleService.getById(editRoleId);
      if (current.name !== editRoleName) {
        await roleService.update(editRoleId, { name: editRoleName });
      }
      const currentIds = current.permissions.map((p) => p.id).sort();
      const nextIds = [...editRolePerms].sort();
      const changed =
        currentIds.length !== nextIds.length ||
        currentIds.some((v, i) => v !== nextIds[i]);
      if (changed) {
        await roleService.replacePermissions(editRoleId, {
          permission_ids: editRolePerms,
        });
      }
      showSuccessToast("Role updated.");
      setEditRoleOpen(false);
      setEditRoleId(null);
      fetchRoles();
    } catch {
      showErrorToast("Failed to update role.");
    } finally {
      setSavingRole(false);
    }
  }

  function confirmDeleteRole(id: number, row: RoleSummary) {
    if (row.is_system) {
      showErrorToast("System roles cannot be deleted.");
      return;
    }
    showConfirmToast({
      title: "Delete role",
      message: `Delete role "${row.name}"?`,
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await roleService.remove(id);
          showSuccessToast("Role deleted.");
          fetchRoles();
        } catch {
          showErrorToast("Failed to delete role.");
        }
      },
    });
  }

  // -------- Permission handlers --------
  async function handleCreatePermission() {
    if (!createPermForm.resource.trim() || !createPermForm.action.trim()) {
      showErrorToast("Resource and action are required.");
      return;
    }
    setCreatingPerm(true);
    try {
      await roleService.createPermission(createPermForm);
      showSuccessToast("Permission created.");
      setCreatePermOpen(false);
      setCreatePermForm(EMPTY_PERMISSION);
      fetchPermissions();
    } catch {
      showErrorToast("Failed to create permission.");
    } finally {
      setCreatingPerm(false);
    }
  }

  function confirmDeletePermission(id: number, row: PermissionRead) {
    showConfirmToast({
      title: "Delete permission",
      message: `Delete permission "${row.resource}:${row.action}"?`,
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await roleService.removePermissionById(id);
          showSuccessToast("Permission deleted.");
          fetchPermissions();
        } catch {
          showErrorToast("Failed to delete permission.");
        }
      },
    });
  }

  async function handleSeedPermissions() {
    setSeeding(true);
    try {
      const res = await roleService.seedPermissions();
      showSuccessToast(
        `Seed complete: ${res.created.length} created, ${res.existing} existing.`
      );
      fetchPermissions();
    } catch {
      showErrorToast("Failed to seed permissions.");
    } finally {
      setSeeding(false);
    }
  }

  // -------- Derived --------
  const roleTotalPages = Math.max(1, Math.ceil(roleTotal / rolePerPage));
  const roleTableData = roles.map((r) => ({
    ...r,
    // is_system: r.is_system ? "Yes" : "No",
  }));

  const permTotal = permissions.length;
  const permTotalPages = Math.max(1, Math.ceil(permTotal / permPerPage));
  const permTableData = useMemo(() => {
    const start = (permPage - 1) * permPerPage;
    return permissions.slice(start, start + permPerPage);
  }, [permissions, permPage, permPerPage]);

  const groupedPermissions = useMemo(() => {
    const map = new Map<string, PermissionRead[]>();
    for (const p of permissions) {
      const list = map.get(p.resource) ?? [];
      list.push(p);
      map.set(p.resource, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  return (
    <div className="flex-1 min-w-0 min-h-screen p-6">
      <div className="mb-4 flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <TabButton active={tab === "roles"} onClick={() => setTab("roles")}>
          Roles
        </TabButton>
        <TabButton
          active={tab === "permissions"}
          onClick={() => setTab("permissions")}
        >
          Permissions
        </TabButton>
      </div>

      {tab === "roles" && (
        <Table
          name="Roles"
          columns={ROLE_COLUMNS}
          data={roleTableData}
          loading={roleLoading}
          query=""
          base="roles"
          addNew={() => {
            setCreateRoleForm(EMPTY_ROLE);
            setCreateRoleOpen(true);
          }}
          buttonName="Add Role"
          actions={[
            { name: "edit", onClick: (id) => openEditRole(id) },
            {
              name: "delete",
              onClick: (id, row) =>
                confirmDeleteRole(id, row as RoleSummary),
            },
          ]}
          pagination={{
            currentPage: rolePage,
            setCurrentPage: setRolePage,
            totalPages: roleTotalPages,
            hasNextPage: rolePage < roleTotalPages,
            itemsPerPage: rolePerPage,
            setItemsPerPage: (n) => {
              setRolePerPage(n);
              setRolePage(1);
            },
          }}
        />
      )}

      {tab === "permissions" && (
        <div>
          {/* <div className="mb-3 flex justify-end">
            <button
              onClick={handleSeedPermissions}
              disabled={seeding}
              className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {seeding ? "Seeding..." : "Seed defaults"}
            </button>
          </div> */}
          <Table
            name="Permissions"
            columns={PERMISSION_COLUMNS}
            data={permTableData}
            loading={permLoading}
            query=""
            base="permissions"
            addNew={() => {
              setCreatePermForm(EMPTY_PERMISSION);
              setCreatePermOpen(true);
            }}
            buttonName="Add Permission"
            actions={[
              {
                name: "delete",
                onClick: (id, row) =>
                  confirmDeletePermission(id, row as PermissionRead),
              },
            ]}
            pagination={{
              currentPage: permPage,
              setCurrentPage: setPermPage,
              totalPages: permTotalPages,
              hasNextPage: permPage < permTotalPages,
              itemsPerPage: permPerPage,
              setItemsPerPage: (n) => {
                setPermPerPage(n);
                setPermPage(1);
              },
            }}
          />
        </div>
      )}

      {/* Create role modal */}
      {createRoleOpen && (
        <Modal
          title="Add Role"
          onClose={() => setCreateRoleOpen(false)}
          wide
        >
          <div className="flex flex-col gap-4">
            <Field label="Name">
              <input
                type="text"
                value={createRoleForm.name}
                onChange={(e) =>
                  setCreateRoleForm({ ...createRoleForm, name: e.target.value })
                }
                className={inputCls}
              />
            </Field>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="role-is-system"
                checked={createRoleForm.is_system ?? false}
                onChange={(e) =>
                  setCreateRoleForm({
                    ...createRoleForm,
                    is_system: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-gray-300 accent-blue-600"
              />
              <label
                htmlFor="role-is-system"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                System role
              </label>
            </div>
            <Field label="Permissions">
              <PermissionPicker
                groups={groupedPermissions}
                selected={createRoleForm.permission_ids ?? []}
                onChange={(ids) =>
                  setCreateRoleForm({ ...createRoleForm, permission_ids: ids })
                }
              />
            </Field>
            <ModalActions
              onCancel={() => setCreateRoleOpen(false)}
              onSubmit={handleCreateRole}
              submitting={creatingRole}
              submitLabel="Create"
            />
          </div>
        </Modal>
      )}

      {/* Edit role modal */}
      {editRoleOpen && (
        <Modal
          title="Edit Role"
          onClose={() => {
            setEditRoleOpen(false);
            setEditRoleId(null);
          }}
          wide
        >
          {editRoleLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <div className="flex flex-col gap-4">
              <Field label="Name">
                <input
                  type="text"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Permissions">
                <PermissionPicker
                  groups={groupedPermissions}
                  selected={editRolePerms}
                  onChange={setEditRolePerms}
                />
              </Field>
              <ModalActions
                onCancel={() => {
                  setEditRoleOpen(false);
                  setEditRoleId(null);
                }}
                onSubmit={handleSaveRole}
                submitting={savingRole}
                submitLabel="Save"
              />
            </div>
          )}
        </Modal>
      )}

      {/* Create permission modal */}
      {createPermOpen && (
        <Modal title="Add Permission" onClose={() => setCreatePermOpen(false)}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Resource">
                <input
                  type="text"
                  value={createPermForm.resource}
                  onChange={(e) =>
                    setCreatePermForm({
                      ...createPermForm,
                      resource: e.target.value,
                    })
                  }
                  placeholder="e.g. roles"
                  className={inputCls}
                />
              </Field>
              <Field label="Action">
                <input
                  type="text"
                  value={createPermForm.action}
                  onChange={(e) =>
                    setCreatePermForm({
                      ...createPermForm,
                      action: e.target.value,
                    })
                  }
                  placeholder="e.g. read"
                  className={inputCls}
                />
              </Field>
            </div>
            <ModalActions
              onCancel={() => setCreatePermOpen(false)}
              onSubmit={handleCreatePermission}
              submitting={creatingPerm}
              submitLabel="Create"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

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

function PermissionPicker({
  groups,
  selected,
  onChange,
}: {
  groups: [string, PermissionRead[]][];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const selectedSet = new Set(selected);

  function toggle(id: number) {
    if (selectedSet.has(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  function toggleGroup(group: PermissionRead[]) {
    const ids = group.map((p) => p.id);
    const allSelected = ids.every((id) => selectedSet.has(id));
    if (allSelected) {
      onChange(selected.filter((x) => !ids.includes(x)));
    } else {
      const next = new Set(selected);
      ids.forEach((id) => next.add(id));
      onChange(Array.from(next));
    }
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No permissions available. Seed defaults or add one first.
      </p>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto rounded border border-gray-300 dark:border-gray-600 divide-y divide-gray-200 dark:divide-gray-700">
      {groups.map(([resource, perms]) => {
        const ids = perms.map((p) => p.id);
        const allSelected = ids.every((id) => selectedSet.has(id));
        const someSelected = ids.some((id) => selectedSet.has(id));
        return (
          <div key={resource} className="p-2">
            <label className="flex items-center gap-2 mb-1 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = !allSelected && someSelected;
                }}
                onChange={() => toggleGroup(perms)}
                className="h-4 w-4 rounded border-gray-300 accent-blue-600"
              />
              <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                {resource}
              </span>
            </label>
            <div className="pl-6 flex flex-wrap gap-3">
              {perms.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-1.5 text-sm cursor-pointer text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedSet.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                  />
                  {p.action}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full ${
          wide ? "max-w-2xl" : "max-w-lg"
        } mx-4`}
      >
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
