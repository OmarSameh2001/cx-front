"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { FormService } from "@/services/form/form";
import { SubmissionService } from "@/services/submission/submission";
import type { FormRead } from "@/dto/form/form";
import type { SubmissionRead } from "@/dto/submission/submission";
import AnswerField from "@/components/form/answer/answer-field";
import {
  showConfirmToast,
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "@/utils/toaster/toaster";

const formService = new FormService();
const submissionService = new SubmissionService();

const AUTO_SAVE_MS = 15_000;

export default function ExamPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = use(params);
  const router = useRouter();

  const [form, setForm] = useState<FormRead | null>(null);
  const [submission, setSubmission] = useState<SubmissionRead | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const dirtyRef = useRef(false);
  const answersRef = useRef<Record<string, unknown>>({});
  answersRef.current = answers;
  const submissionRef = useRef<SubmissionRead | null>(null);
  submissionRef.current = submission;

  // --- bootstrap: load form + start (or resume) session ---
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const f = await formService.getById(Number(formId));
        if (cancelled) return;
        setForm(f);
        const s = await submissionService.start({ form_id: Number(formId) });
        if (cancelled) return;
        if (s.status !== "in_progress") {
          // already finalized — go view it
          router.replace(`/submissions/${s.id}`);
          return;
        }
        setSubmission(s);
        // load existing draft answers via detail (owner sees its own answers
        // when in progress; if not, will be null)
        try {
          const detail = await submissionService.getDetail(s.id);
          if (!cancelled && detail.answers) {
            setAnswers(detail.answers);
          }
        } catch {
          // not fatal — start fresh
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Could not start exam");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formId, router]);

  // --- live clock for countdown ---
  useEffect(() => {
    if (!submission?.expires_at) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [submission?.expires_at]);

  // --- resync on tab focus (handles laptop sleep) ---
  useEffect(() => {
    function onFocus() {
      const s = submissionRef.current;
      if (!s || s.status !== "in_progress") return;
      submissionService
        .getById(s.id)
        .then((latest) => {
          setSubmission(latest);
          if (latest.status !== "in_progress") {
            showWarningToast(`Submission is ${latest.status}`);
            router.replace(`/submissions/${latest.id}`);
          }
        })
        .catch(() => {
          /* ignore */
        });
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [router]);

  // --- beforeunload warning while in progress ---
  useEffect(() => {
    function onUnload(e: BeforeUnloadEvent) {
      if (submissionRef.current?.status !== "in_progress") return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  // --- autosave loop ---
  const saveDraft = useCallback(async () => {
    const s = submissionRef.current;
    if (!s || s.status !== "in_progress") return;
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    try {
      const updated = await submissionService.saveDraft(s.id, {
        answers: answersRef.current,
      });
      setSubmission(updated);
    } catch {
      // mark dirty again so we retry next tick
      dirtyRef.current = true;
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      void saveDraft();
    }, AUTO_SAVE_MS);
    return () => clearInterval(id);
  }, [saveDraft]);

  const updateAnswer = (fieldId: number, value: unknown) => {
    dirtyRef.current = true;
    setAnswers((prev) => ({ ...prev, [String(fieldId)]: value }));
  };

  // --- auto-submit on expiry ---
  const remainingMs = useMemo(() => {
    if (!submission?.expires_at) return null;
    return new Date(submission.expires_at).getTime() - now;
  }, [submission?.expires_at, now]);

  const submittedRef = useRef(false);
  useEffect(() => {
    if (remainingMs == null) return;
    if (remainingMs > 0) return;
    if (submittedRef.current) return;
    submittedRef.current = true;
    showWarningToast("Time is up. Submitting your answers...");
    doSubmit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs]);

  const runSubmit = useCallback(async () => {
    const s = submissionRef.current;
    if (!s || s.status !== "in_progress") return;
    setSubmitting(true);
    try {
      await saveDraft();
      const final = await submissionService.submit(s.id, {
        answers: answersRef.current,
      });
      setSubmission(final);
      submittedRef.current = true;
      showSuccessToast("Submission saved");
      router.replace(`/submissions/${final.id}`);
    } catch (e) {
      submittedRef.current = false;
      showErrorToast(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }, [router, saveDraft]);

  function doSubmit(auto = false) {
    const s = submissionRef.current;
    if (!s || s.status !== "in_progress") return;
    if (auto) {
      void runSubmit();
      return;
    }
    showConfirmToast({
      title: "Submit answers?",
      message: "You can't edit after this.",
      confirmText: "Submit",
      onConfirm: () => void runSubmit(),
    });
  }

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-muted/40 flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (error || !form || !submission) {
    return (
      <div className="flex-1 min-h-screen bg-muted/40 flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-destructive">{error ?? "Could not load form"}</p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 rounded-md border border-border text-sm"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const expired = remainingMs != null && remainingMs <= 0;
  const isExam = form.type === "exam";

  return (
    <div className="flex-1 min-h-screen bg-muted/40">
      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          {isExam && remainingMs != null && (
            <CountdownChip remainingMs={remainingMs} />
          )}
        </div>

        <header className="rounded-lg bg-card text-card-foreground border border-border border-t-8 border-t-primary shadow-sm p-6">
          <h1 className="text-2xl font-semibold text-foreground">{form.name}</h1>
          {form.description && (
            <p className="text-sm text-muted-foreground mt-2">
              {form.description}
            </p>
          )}
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
            <span>Attempt #{submission.attempt_number}</span>
            {form.max_attempts != null && (
              <span>Max attempts: {form.max_attempts}</span>
            )}
            {form.time_limit_minutes != null && (
              <span>Time limit: {form.time_limit_minutes} min</span>
            )}
          </div>
        </header>

        <form className="flex flex-col gap-4">
          {form.fields.map((field, idx) => (
            <div
              key={field.id}
              className="rounded-lg bg-card text-card-foreground border border-border shadow-sm p-5 flex flex-col gap-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {idx + 1}. {field.question}
                  {field.is_required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </p>
                {field.help_text && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {field.help_text}
                  </p>
                )}
              </div>
              <AnswerField
                field={field}
                value={answers[String(field.id)]}
                onChange={(v) => updateAnswer(field.id, v)}
                disabled={expired || submitting}
              />
            </div>
          ))}
        </form>

        <div className="flex justify-end gap-2 pb-10">
          <button
            type="button"
            onClick={() => void saveDraft()}
            disabled={submitting}
            className="px-4 py-2 rounded-md border border-border bg-background text-sm font-medium disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={() => doSubmit(false)}
            disabled={submitting || expired}
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CountdownChip({ remainingMs }: { remainingMs: number }) {
  const ms = Math.max(0, remainingMs);
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  const danger = ms <= 60_000;
  return (
    <span
      className={[
        "inline-flex items-center gap-1 text-sm font-mono px-3 py-1 rounded-full border",
        danger
          ? "bg-destructive/10 text-destructive border-destructive/40"
          : "bg-muted text-foreground border-border",
      ].join(" ")}
    >
      <Clock className="h-4 w-4" />
      {mm}:{ss}
    </span>
  );
}
