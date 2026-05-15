"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { SubmissionService } from "@/services/submission/submission";
import type {
  SubmissionDetail,
  SubmissionDetailField,
} from "@/dto/submission/submission";
import { showErrorToast } from "@/utils/toaster/toaster";

const submissionService = new SubmissionService();

const STATUS_TONE: Record<string, string> = {
  in_progress: "bg-muted text-muted-foreground border-border",
  submitted: "bg-primary/10 text-primary border-primary/40",
  late: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/40",
  expired: "bg-destructive/10 text-destructive border-destructive/40",
};

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    submissionService
      .getDetail(Number(id))
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled)
          showErrorToast(e instanceof Error ? e.message : "Could not load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-muted/40 flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="flex-1 min-h-screen bg-muted/40 flex items-center justify-center text-sm text-muted-foreground">
        Submission not found.
      </div>
    );
  }

  const revealed = detail.fields.some((f) => f.question != null);

  return (
    <div className="flex-1 min-h-screen bg-muted/40">
      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-4">
        <Link
          href="/submissions/mine"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to my submissions
        </Link>

        <header className="rounded-lg bg-card text-card-foreground border border-border shadow-sm p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-foreground">
              Submission #{detail.id}
            </h1>
            <span
              className={[
                "text-xs px-2 py-0.5 rounded-full border",
                STATUS_TONE[detail.status] ?? "",
              ].join(" ")}
            >
              {detail.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Attempt #{detail.attempt_number}</span>
            <span>Started: {formatDate(detail.started_at)}</span>
            {detail.submitted_at && (
              <span>Submitted: {formatDate(detail.submitted_at)}</span>
            )}
            <span>Score: {detail.score == null ? "—" : detail.score}</span>
          </div>
        </header>

        {!revealed ? (
          <div className="rounded-lg bg-card text-card-foreground border border-border p-8 text-center text-sm text-muted-foreground">
            Results will be available once your reviewer publishes them.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {detail.fields.map((field, idx) => (
              <FieldReveal
                key={field.id}
                idx={idx}
                field={field}
                answer={detail.answers?.[String(field.id)]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FieldReveal({
  idx,
  field,
  answer,
}: {
  idx: number;
  field: SubmissionDetailField;
  answer: unknown;
}) {
  const correct = isCorrect(field, answer);
  return (
    <div className="rounded-lg bg-card text-card-foreground border border-border shadow-sm p-5 flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">
        {idx + 1}. {field.question ?? `Question ${idx + 1}`}
      </p>
      <p className="text-xs text-muted-foreground">
        Your answer:{" "}
        <span className="text-foreground">{renderAnswer(answer)}</span>
      </p>
      {field.right_answer != null && (
        <p className="text-xs text-muted-foreground">
          Correct answer:{" "}
          <span className="text-foreground">{field.right_answer}</span>
        </p>
      )}
      {correct != null && (
        <p
          className={[
            "text-xs font-medium",
            correct ? "text-green-700 dark:text-green-400" : "text-destructive",
          ].join(" ")}
        >
          {correct ? "Correct" : "Incorrect"}
        </p>
      )}
    </div>
  );
}

function renderAnswer(v: unknown): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function isCorrect(
  field: SubmissionDetailField,
  answer: unknown
): boolean | null {
  if (field.right_answer == null) return null;
  if (field.type === "multi_choice") {
    const expected = new Set(
      field.right_answer.split(",").map((s) => s.trim()).filter(Boolean)
    );
    const got = new Set(
      Array.isArray(answer)
        ? answer.map(String)
        : typeof answer === "string"
        ? answer.split(",").map((s) => s.trim()).filter(Boolean)
        : []
    );
    if (expected.size !== got.size) return false;
    for (const v of expected) if (!got.has(v)) return false;
    return true;
  }
  return String(answer ?? "").trim() === field.right_answer.trim();
}

function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}
