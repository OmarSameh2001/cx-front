"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Save, X, Loader2 } from "lucide-react";
import { useAuth } from "@/app/_providers/auth-provider";
import { EmployeeService } from "@/services/employee/employee";
import type {
  EmployeeRead,
  EmployeeUpdate,
} from "@/dto/employee/employee";

const employeeService = new EmployeeService();

type FieldKey =
  | "first_name"
  | "last_name"
  | "username"
  | "email"
  | "phone"
  | "dob"
  | "gender";

const FIELDS: { key: FieldKey; label: string; type: string }[] = [
  { key: "first_name", label: "First Name", type: "text" },
  { key: "last_name", label: "Last Name", type: "text" },
  { key: "username", label: "Username", type: "text" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone", type: "tel" },
  { key: "dob", label: "Date of Birth", type: "date" },
  { key: "gender", label: "Gender", type: "text" },
];

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();

  const [employee, setEmployee] = useState<EmployeeRead | null>(null);
  const [form, setForm] = useState<EmployeeUpdate>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await employeeService.getById(user.id);
      setEmployee(data);
      setForm(toFormValues(data));
    } catch {
      setError("Failed to load your profile.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading) fetchProfile();
  }, [authLoading, fetchProfile]);

  const initials = useMemo(() => {
    const f = employee?.first_name?.[0] ?? "";
    const l = employee?.last_name?.[0] ?? "";
    return (f + l).toUpperCase() || "?";
  }, [employee]);

  function set<K extends FieldKey>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value === "" ? null : value }));
  }

  function startEdit() {
    if (!employee) return;
    setForm(toFormValues(employee));
    setEditing(true);
    setError(null);
  }

  function cancelEdit() {
    if (employee) setForm(toFormValues(employee));
    setEditing(false);
    setError(null);
  }

  async function handleSave() {
    if (!employee) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await employeeService.update(employee.id, form);
      setEmployee(updated);
      setForm(toFormValues(updated));
      setEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2200);
    } catch {
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={18} />
        Loading profile...
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <p className="text-destructive text-sm text-center">
          {error ?? "Profile unavailable."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header card */}
        <section className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="bg-primary/10 h-20 sm:h-28" />
          <div className="px-4 sm:px-6 -mt-10 sm:-mt-12 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:gap-5">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl sm:text-3xl font-semibold ring-4 ring-card shrink-0">
                {initials}
              </div>
              <div className="mt-3 sm:mt-0 sm:pb-2 flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold truncate">
                  {employee.first_name} {employee.last_name}
                </h1>
                <p className="text-sm text-muted-foreground truncate">
                  {employee.email}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone={employee.is_active ? "success" : "muted"}>
                    {employee.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {user?.role && <Badge tone="primary">{user.role}</Badge>}
                </div>
              </div>
              <div className="mt-4 sm:mt-0 sm:pb-2">
                {!editing ? (
                  <button
                    onClick={startEdit}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <Pencil size={16} />
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md border border-border bg-secondary text-secondary-foreground text-sm hover:bg-muted disabled:opacity-50"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      {saving ? "Saving" : "Save"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Status messages */}
        {error && (
          <p
            role="alert"
            className="mt-4 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2"
          >
            {error}
          </p>
        )}
        {savedFlash && (
          <p className="mt-4 text-sm text-success bg-success/10 border border-success/30 rounded-md px-3 py-2">
            Profile updated.
          </p>
        )}

        {/* Details card */}
        <section className="mt-5 rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <header className="px-4 sm:px-6 py-4 border-b border-border">
            <h2 className="text-base sm:text-lg font-semibold">
              Personal Information
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {editing
                ? "Update your details and save."
                : "Your saved profile details."}
            </p>
          </header>

          <div className="px-4 sm:px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FIELDS.map((f) => (
              <FieldRow
                key={f.key}
                label={f.label}
                editing={editing}
                value={(form[f.key] as string | null | undefined) ?? ""}
                displayValue={
                  (employee[f.key] as string | null | undefined) ?? ""
                }
                type={f.type}
                onChange={(v) => set(f.key, v)}
              />
            ))}
          </div>
        </section>

        {/* Mobile sticky action bar while editing */}
        {editing && (
          <div className="sm:hidden sticky bottom-0 left-0 right-0 mt-6 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-t border-border flex gap-2">
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md border border-border bg-secondary text-secondary-foreground text-sm hover:bg-muted disabled:opacity-50"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? "Saving" : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  displayValue,
  type,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  displayValue: string;
  type: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </label>
      {editing ? (
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
        />
      ) : (
        <p className="text-sm text-foreground py-2 break-words min-h-[2.25rem]">
          {displayValue || (
            <span className="text-muted-foreground italic">Not set</span>
          )}
        </p>
      )}
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "success" | "muted" | "primary";
}) {
  const cls =
    tone === "success"
      ? "bg-success/15 text-success border-success/30"
      : tone === "primary"
      ? "bg-primary/15 text-primary border-primary/30"
      : "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

function toFormValues(e: EmployeeRead): EmployeeUpdate {
  return {
    first_name: e.first_name,
    last_name: e.last_name,
    username: e.username,
    email: e.email,
    phone: e.phone,
    dob: e.dob,
    gender: e.gender,
  };
}
