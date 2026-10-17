"use client";

import { use, useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import AnswerField from "@/components/form/answer/answer-field";
import type { FormFieldRead } from "@/dto/form/form";
import type { PublicForm, PublicFormField } from "@/dto/public/public";
import { PublicService } from "@/services/public/public";
import {
  showErrorToast,
  showSuccessToast,
} from "@/utils/toaster/toaster";
import { HttpError } from "@/services/http";
import { firstMissingRequired, orderedSections } from "@/utils/form/branching";
import { useSectionPager } from "@/utils/form/use-section-pager";
import {
  clearPublicProgress,
  publicProgressKey,
  readPublicProgress,
  writePublicProgress,
} from "@/utils/form/progress-storage";
import { AuthValidator } from "@/utils/validator/auth";

const NO_FIELDS: PublicFormField[] = [];

function toAnswerField(f: PublicFormField): FormFieldRead {
  return {
    id: f.id,
    question: f.question,
    type: f.type as FormFieldRead["type"],
    options: f.options ?? null,
    right_answer: null,
    order: f.order,
    help_text: f.help_text ?? null,
    is_required: f.is_required,
    score_weight: 0,
  };
}

export default function PublicFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [form, setForm] = useState<PublicForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // one section per page, following branching
  const paged = (form?.sections?.length ?? 0) > 0;
  const pager = useSectionPager(
    paged ? form!.sections! : null,
    form?.fields ?? NO_FIELDS,
    answers
  );
  const onFirstPage = !pager.canGoBack;
  const restorePath = pager.restore;
  const progressKey = publicProgressKey(token);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    PublicService.getForm(token)
      .then((f) => {
        if (cancelled) return;
        setForm(f);
        // a refresh puts the respondent back where they were
        const saved = readPublicProgress(publicProgressKey(token));
        if (saved) {
          setEmail(saved.email);
          setFirstName(saved.firstName);
          setLastName(saved.lastName);
          setPhone(saved.phone);
          setAnswers(saved.answers);
          restorePath(saved.path);
        }
      })
      .catch((e) => {
        if (!cancelled)
          setLoadError(
            e instanceof Error ? e.message : "Could not load the form"
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, restorePath]);

  // keep unsent progress through a refresh; cleared once submitted
  const pathKey = pager.path.join(",");
  useEffect(() => {
    if (!form || done) return;
    writePublicProgress(progressKey, {
      email,
      firstName,
      lastName,
      phone,
      answers,
      path: pathKey ? pathKey.split(",").map(Number) : [],
    });
  }, [form, done, progressKey, email, firstName, lastName, phone, answers, pathKey]);

  const updateAnswer = (id: number, v: unknown) =>
    setAnswers((prev) => ({ ...prev, [String(id)]: v }));

  // details live on the first page only, so send the respondent there to fix them
  function backToDetails() {
    pager.reset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function detailsInvalid() {
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      showErrorToast("Please fill in your email, first name and last name.");
      return true;
    }
    const emailError = AuthValidator.email(email);
    if (emailError) {
      showErrorToast(emailError);
      return true;
    }
    return false;
  }

  // required answers only count on the sections the respondent goes through
  function missingAnswer(sectionIds: number[] | null) {
    if (!form) return null;
    const ids = sectionIds && new Set(sectionIds);
    return firstMissingRequired(
      [...form.fields]
        .filter((f) => !ids || (f.section_id != null && ids.has(f.section_id)))
        .sort((a, b) => a.order - b.order),
      answers
    );
  }

  function goNext() {
    if (!pager.current) return;
    if (onFirstPage && detailsInvalid()) return;
    const missing = missingAnswer([pager.current.id]);
    if (missing) {
      showErrorToast(`Please answer: ${missing.question}`);
      return;
    }
    pager.goNext();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    pager.goBack();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    if (!form) return;
    if (detailsInvalid()) {
      if (!onFirstPage) backToDetails();
      return;
    }
    const missing = missingAnswer(paged ? pager.path : null);
    if (missing) {
      showErrorToast(`Please answer: ${missing.question}`);
      return;
    }
    setSubmitting(true);
    try {
      await PublicService.submit(token, {
        customer: {
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
        },
        answers,
      });
      showSuccessToast("Thanks! Your response has been submitted.");
      clearPublicProgress(progressKey);
      setDone(true);
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : "Could not submit");
      const aboutDetails =
        e instanceof HttpError &&
        (e.code === "customer_details_mismatch" ||
          e.fields.some((f) => f.startsWith("body.customer")));
      if (aboutDetails && !onFirstPage) backToDetails();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-muted/40 flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (loadError || !form) {
    return (
      <div className="flex-1 min-h-screen bg-muted/40 flex items-center justify-center px-4">
        <div className="max-w-md rounded-lg bg-card text-card-foreground border border-border p-8 text-center">
          <h1 className="text-lg font-semibold text-foreground">
            This form isn&apos;t available
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {loadError ?? "The link may be expired or revoked."}
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex-1 min-h-screen bg-muted/40 flex items-center justify-center px-4">
        <div className="max-w-md rounded-lg bg-card text-card-foreground border border-border p-10 text-center flex flex-col items-center gap-3">
          <CheckCircle2 className="h-10 w-10 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Submitted</h1>
          <p className="text-sm text-muted-foreground">
            Thanks for your response.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-muted/40">
      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-4">
        <header className="rounded-lg bg-card text-card-foreground border border-border border-t-8 border-t-primary shadow-sm p-6">
          <h1 className="text-2xl font-semibold text-foreground">{form.name}</h1>
          {form.description && (
            <p className="text-sm text-muted-foreground mt-2">
              {form.description}
            </p>
          )}
        </header>

        {onFirstPage && (
          <section className="rounded-lg bg-card text-card-foreground border border-border shadow-sm p-5 flex flex-col gap-3">
            <h2 className="text-sm font-medium text-foreground">Your details</h2>
            <p className="text-xs text-muted-foreground">
              If you&apos;ve submitted a form here before, use the same details.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabeledInput
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                required
                disabled={submitting}
              />
              <LabeledInput
                label="Phone"
                type="tel"
                value={phone}
                onChange={setPhone}
                disabled={submitting}
              />
              <LabeledInput
                label="First name"
                value={firstName}
                onChange={setFirstName}
                required
                disabled={submitting}
              />
              <LabeledInput
                label="Last name"
                value={lastName}
                onChange={setLastName}
                required
                disabled={submitting}
              />
            </div>
          </section>
        )}

        {/* Enter in a lone input would otherwise submit natively and reload */}
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <PublicFormFields
            form={form}
            answers={answers}
            disabled={submitting}
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
          {paged && !pager.isLast ? (
            <button
              type="button"
              onClick={goNext}
              disabled={submitting}
              className="ml-auto inline-flex items-center gap-1 px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="ml-auto px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PublicFormFields({
  form,
  answers,
  disabled,
  onAnswer,
  onlySectionId,
  startNumber = 0,
}: {
  form: PublicForm;
  answers: Record<string, unknown>;
  disabled: boolean;
  onAnswer: (id: number, v: unknown) => void;
  /** Render just this section (paged forms). */
  onlySectionId?: number;
  /** Questions answered on earlier pages of the path, for numbering. */
  startNumber?: number;
}) {
  const sections = orderedSections(form.sections ?? []);
  const hasSections = sections.length > 0;

  const sortedFields = [...form.fields].sort((a, b) => a.order - b.order);

  // a single page continues from the questions already seen on the path
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

  const renderField = (field: PublicFormField, num: number) => (
    <div
      key={field.id}
      className="rounded-lg bg-card text-card-foreground border border-border shadow-sm p-5 flex flex-col gap-3"
    >
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

  if (!hasSections) {
    return <>{sortedFields.map((f) => renderField(f, fieldNumber.get(f.id)!))}</>;
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
            {sFields.map((f) => renderField(f, fieldNumber.get(f.id)!))}
          </div>
        );
      })}
    </>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
      />
    </label>
  );
}
