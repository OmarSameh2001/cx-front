"use client";

import { use, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import AnswerField from "@/components/form/answer/answer-field";
import type { FormFieldRead } from "@/dto/form/form";
import type { PublicForm, PublicFormField } from "@/dto/public/public";
import { PublicService } from "@/services/public/public";
import {
  showErrorToast,
  showSuccessToast,
} from "@/utils/toaster/toaster";

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    PublicService.getForm(token)
      .then((f) => {
        if (!cancelled) setForm(f);
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
  }, [token]);

  const updateAnswer = (id: number, v: unknown) =>
    setAnswers((prev) => ({ ...prev, [String(id)]: v }));

  async function handleSubmit() {
    if (!form) return;
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      showErrorToast("Please fill in your email, first name and last name.");
      return;
    }
    for (const f of form.fields) {
      if (!f.is_required) continue;
      const v = answers[String(f.id)];
      if (
        v == null ||
        v === "" ||
        (Array.isArray(v) && v.length === 0)
      ) {
        showErrorToast(`Please answer: ${f.question}`);
        return;
      }
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
      setDone(true);
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : "Could not submit");
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

        <form className="flex flex-col gap-4">
          <PublicFormFields
            form={form}
            answers={answers}
            disabled={submitting}
            onAnswer={updateAnswer}
          />
        </form>

        <div className="flex justify-end pb-10">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
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
}: {
  form: PublicForm;
  answers: Record<string, unknown>;
  disabled: boolean;
  onAnswer: (id: number, v: unknown) => void;
}) {
  const sections = (form.sections ?? []).slice().sort((a, b) => a.order - b.order);
  const hasSections = sections.length > 0;

  const sortedFields = [...form.fields].sort((a, b) => a.order - b.order);

  const fieldNumber = new Map<number, number>();
  if (hasSections) {
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

  return (
    <>
      {sections.map((section) => {
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
