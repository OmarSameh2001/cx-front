"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { SubmissionService } from "@/services/submission/submission";
import type { FormFieldRead } from "@/dto/form/form";
import type {
  RespondentField,
  RespondentForm,
  SubmissionRead,
} from "@/dto/submission/submission";
import AnswerField from "@/components/form/answer/answer-field";
import {
  showConfirmToast,
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "@/utils/toaster/toaster";
import { firstMissingRequired, isAnswerMissing, orderedSections } from "@/utils/form/branching";
import { useSectionPager } from "@/utils/form/use-section-pager";
import { useNavigationGuard } from "@/app/_providers/navigation-guard-provider";

const submissionService = new SubmissionService();

const AUTO_SAVE_MS = 15_000;
const NO_FIELDS: RespondentField[] = [];

// AnswerField takes the editor's field shape; a respondent has no grading data
function toAnswerField(f: RespondentField): FormFieldRead {
  return {
    ...f,
    options: f.options ?? null,
    help_text: f.help_text ?? null,
    right_answer: null,
    score_weight: 0,
  };
}

export default function ExamPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = use(params);
  const router = useRouter();

  const [form, setForm] = useState<RespondentForm | null>(null);
  const [submission, setSubmission] = useState<SubmissionRead | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const { setGuarded } = useNavigationGuard();

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
        // start (or resume) first: the questions come with the attempt, and
        // without the correct answers
        const s = await submissionService.start({ form_id: Number(formId) });
        if (cancelled) return;
        if (s.status !== "in_progress") {
          // already finalized — go view it
          router.replace(`/submissions/${s.id}`);
          return;
        }
        const f = await submissionService.getForm(s.id);
        if (cancelled) return;
        setForm(f);
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

  // --- block tab close / refresh while in progress ---
  useEffect(() => {
    function onUnload(e: BeforeUnloadEvent) {
      if (submissionRef.current?.status !== "in_progress") return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const leaveMessage =
    form?.type === "exam"
      ? "You cannot leave the exam while it is in progress."
      : "You cannot leave this form while it is in progress.";

  // --- block browser back button while in progress ---
  useEffect(() => {
    if (submission?.status !== "in_progress") return;
    window.history.pushState(null, "", window.location.href);
    function onPopState() {
      window.history.pushState(null, "", window.location.href);
      showWarningToast(leaveMessage);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [submission?.status, leaveMessage]);

  // --- activate/deactivate the global navigation guard ---
  useEffect(() => {
    const active = submission?.status === "in_progress";
    setGuarded(active);
    return () => setGuarded(false);
  }, [submission?.status, setGuarded]);

  // --- block sidebar / all link navigation while in progress ---
  useEffect(() => {
    if (submission?.status !== "in_progress") return;
    function onLinkClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href === "#" || href === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      showWarningToast(leaveMessage);
    }
    document.addEventListener("click", onLinkClick, true);
    return () => document.removeEventListener("click", onLinkClick, true);
  }, [submission?.status, leaveMessage]);

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
    // exam questions aren't required, so warn about blanks instead of blocking
    const unanswered =
      form?.type === "exam"
        ? form.fields.filter((f) => isAnswerMissing(answersRef.current[String(f.id)])).length
        : 0;
    showConfirmToast({
      title: unanswered > 0 ? "Submit with unanswered questions?" : "Submit answers?",
      message:
        unanswered > 0
          ? `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}; they will score 0. You can't edit after this.`
          : "You can't edit after this.",
      confirmText: unanswered > 0 ? "Submit anyway" : "Submit",
      onConfirm: () => void runSubmit(),
    });
  }

  // --- section pages (questionnaires with sections), following branching ---
  const paged =
    form?.type === "questionnaire" && (form.sections?.length ?? 0) > 0;
  const pager = useSectionPager(
    paged ? form!.sections! : null,
    form?.fields ?? NO_FIELDS,
    answers
  );

  // required answers are checked page by page; only the path counts
  function missingOn(sectionIds: number[]) {
    if (!form) return null;
    const ids = new Set(sectionIds);
    return firstMissingRequired(
      [...form.fields]
        .filter((f) => f.section_id != null && ids.has(f.section_id))
        .sort((a, b) => a.order - b.order),
      answers
    );
  }

  function goNext() {
    if (!pager.current) return;
    const missing = missingOn([pager.current.id]);
    if (missing) {
      showErrorToast(`Please answer: ${missing.question}`);
      return;
    }
    void saveDraft();
    pager.goNext();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    pager.goBack();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmitClick() {
    if (paged) {
      const missing = missingOn(pager.path);
      if (missing) {
        showErrorToast(`Please answer: ${missing.question}`);
        return;
      }
    }
    doSubmit(false);
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
            onClick={() => {
              if (submission.status === "in_progress") {
                showWarningToast(leaveMessage);
                return;
              }
              router.push("/dashboard");
            }}
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

        {/* Enter in a lone input would otherwise submit natively and reload */}
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <FormFields
            form={form}
            answers={answers}
            disabled={expired || submitting}
            onAnswer={updateAnswer}
            onlySectionId={paged ? pager.current?.id : undefined}
            startNumber={pager.questionsBefore}
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 pb-10">
          {paged && pager.canGoBack && (
            <button
              type="button"
              onClick={goBack}
              disabled={submitting}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-md border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/60 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
          )}
          <div className="flex flex-wrap gap-2 ml-auto">
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={submitting}
              className="px-4 py-2 rounded-md border border-border bg-background text-sm font-medium disabled:opacity-50"
            >
              Save draft
            </button>
            {paged && !pager.isLast ? (
              <button
                type="button"
                onClick={goNext}
                disabled={submitting}
                className="inline-flex items-center gap-1 px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitClick}
                disabled={submitting || expired}
                className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormFields({
  form,
  answers,
  disabled,
  onAnswer,
  onlySectionId,
  startNumber = 0,
}: {
  form: RespondentForm;
  answers: Record<string, unknown>;
  disabled: boolean;
  onAnswer: (fieldId: number, value: unknown) => void;
  /** Render just this section (paged questionnaires). */
  onlySectionId?: number;
  /** Questions answered on earlier pages of the path, for numbering. */
  startNumber?: number;
}) {
  const sections = orderedSections(form.sections ?? []);
  const hasSections = sections.length > 0;

  const sortedFields = [...form.fields].sort((a, b) => a.order - b.order);

  // Build global question numbers preserving section order; a single page
  // continues from the questions already seen on the path
  const fieldNumber = new Map<number, number>();
  if (onlySectionId != null) {
    sortedFields
      .filter((f) => f.section_id === onlySectionId)
      .forEach((f, i) => fieldNumber.set(f.id, startNumber + i + 1));
  } else if (hasSections) {
    let n = 0;
    for (const section of sections) {
      for (const f of sortedFields.filter((sf) => sf.section_id === section.id)) {
        fieldNumber.set(f.id, ++n);
      }
    }
  } else {
    sortedFields.forEach((f, i) => fieldNumber.set(f.id, i + 1));
  }

  if (!hasSections) {
    return (
      <>
        {sortedFields.map((field) => (
          <FieldAnswerCard
            key={field.id}
            field={field}
            num={fieldNumber.get(field.id)!}
            answers={answers}
            disabled={disabled}
            onAnswer={onAnswer}
          />
        ))}
      </>
    );
  }

  const shown =
    onlySectionId != null
      ? sections.filter((s) => s.id === onlySectionId)
      : sections;

  return (
    <>
      {shown.map((section) => {
        const sFields = sortedFields.filter((f) => f.section_id === section.id);
        return (
          <div key={section.id} className="flex flex-col gap-4">
            <div className="rounded-lg bg-card text-card-foreground border border-border border-l-4 border-l-primary shadow-sm p-5">
              <h2 className="text-base font-semibold text-foreground">
                {section.title}
              </h2>
              {section.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {section.description}
                </p>
              )}
            </div>
            {sFields.map((field) => (
              <FieldAnswerCard
                key={field.id}
                field={field}
                num={fieldNumber.get(field.id)!}
                answers={answers}
                disabled={disabled}
                onAnswer={onAnswer}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

function FieldAnswerCard({
  field,
  num,
  answers,
  disabled,
  onAnswer,
}: {
  field: RespondentField;
  num: number;
  answers: Record<string, unknown>;
  disabled: boolean;
  onAnswer: (fieldId: number, value: unknown) => void;
}) {
  return (
    <div className="rounded-lg bg-card text-card-foreground border border-border shadow-sm p-5 flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-foreground">
          {num}. {field.question}
          {field.is_required && (
            <span className="text-destructive ml-1">*</span>
          )}
        </p>
        {field.help_text && (
          <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
        )}
      </div>
      <AnswerField
        field={toAnswerField(field)}
        value={answers[String(field.id)]}
        onChange={(v) => onAnswer(field.id, v)}
        disabled={disabled}
      />
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
