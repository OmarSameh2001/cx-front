"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clock, FileText, RotateCw } from "lucide-react";
import { FormService } from "@/services/form/form";
import type { AssignedFormSummary, MyStatus } from "@/dto/form/form";
import { showErrorToast } from "@/utils/toaster/toaster";

const formService = new FormService();

const OPEN_STATUSES: MyStatus[] = ["not_started", "in_progress"];
const DONE_STATUSES: MyStatus[] = ["submitted", "late", "expired"];

const STATUS_LABEL: Record<MyStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  late: "Submitted (late)",
  expired: "Expired",
};

export default function DashboardPage() {
  const [tab, setTab] = useState<"open" | "done">("open");
  const [items, setItems] = useState<AssignedFormSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    formService
      .listAssignedToMe({ limit: 100 })
      .then((page) => {
        if (!cancelled) setItems(page.items);
      })
      .catch(() => {
        if (!cancelled) showErrorToast("Could not load assigned forms");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const allow = tab === "open" ? OPEN_STATUSES : DONE_STATUSES;
    return items.filter((i) => allow.includes(i.my_status));
  }, [items, tab]);

  return (
    <div className="flex-1 min-w-0 min-h-screen p-6 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">My forms</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Forms assigned to you. Pick one up where you left off, or review what
          you&apos;ve submitted.
        </p>
      </header>

      <div className="flex gap-2 border-b border-border">
        <TabButton active={tab === "open"} onClick={() => setTab("open")}>
          Open to answer
        </TabButton>
        <TabButton active={tab === "done"} onClick={() => setTab("done")}>
          Completed
        </TabButton>
      </div>

      {loading ? (
        <div className="rounded-lg bg-card text-card-foreground border border-border p-10 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg bg-card text-card-foreground border border-border p-10 text-center text-sm text-muted-foreground">
          {tab === "open"
            ? "No forms waiting for you."
            : "You haven't submitted anything yet."}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => (
            <FormCard key={f.id} form={f} tab={tab} />
          ))}
        </div>
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
      type="button"
      onClick={onClick}
      className={[
        "px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function FormCard({
  form,
  tab,
}: {
  form: AssignedFormSummary;
  tab: "open" | "done";
}) {
  const isExam = form.type === "exam";
  const href =
    tab === "open"
      ? isExam
        ? `/exam/${form.id}`
        : `/exam/${form.id}`
      : `/submissions/mine?form_id=${form.id}`;
  const ctaLabel =
    tab === "open"
      ? form.my_status === "in_progress"
        ? "Resume"
        : "Start"
      : "View";

  return (
    <Link
      href={href}
      className="rounded-lg bg-card text-card-foreground border border-border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground line-clamp-1">
            {form.name}
          </h2>
        </div>
        <span
          className={[
            "shrink-0 text-xs px-2 py-0.5 rounded-full border",
            form.type === "exam"
              ? "bg-primary/10 text-primary border-primary/40"
              : "bg-muted text-muted-foreground border-border",
          ].join(" ")}
        >
          {form.type}
        </span>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>Status: {STATUS_LABEL[form.my_status]}</span>
        {form.time_limit_minutes != null && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {form.time_limit_minutes} min
          </span>
        )}
        {form.max_attempts != null && (
          <span className="flex items-center gap-1">
            <RotateCw className="h-3 w-3" />
            {form.attempts_used}/{form.max_attempts}
          </span>
        )}
      </div>
      <div className="pt-2 border-t border-border text-sm font-medium text-primary">
        {ctaLabel} →
      </div>
    </Link>
  );
}
