"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Sparkles } from "lucide-react";
import {
  AI_DEFAULT_MAX_QUESTIONS,
  AI_MAX_QUESTIONS_LIMIT,
  AI_PROMPT_MAX_LENGTH,
  AI_PROMPT_MIN_LENGTH,
  type FormGenerateRequest,
} from "@/dto/ai/form-generate";
import type { FormCreatePayload, FormType } from "@/dto/form/form";
import { AiService } from "@/services/ai/ai";
import { HttpError } from "@/services/http";
import { showErrorToast } from "@/utils/toaster/toaster";

const aiService = new AiService();

type Props = {
  onDraft: (payload: FormCreatePayload) => void;
};

function errorMessage(e: unknown): string {
  if (e instanceof HttpError) {
    if (e.code === "ai_unavailable") return `${e.message} Please try again later.`;
    if (e.code === "ai_generation_failed") return `${e.message} Try rephrasing your description.`;
    return e.message;
  }
  return "Failed to generate the form";
}

export default function AiGeneratePanel({ onDraft }: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<FormType | "">("");
  const [language, setLanguage] = useState("");
  const [maxQuestions, setMaxQuestions] = useState<string>(String(AI_DEFAULT_MAX_QUESTIONS));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const promptLength = prompt.trim().length;
  const parsedMax = maxQuestions.trim() === "" ? null : Number(maxQuestions);
  const maxValid =
    parsedMax == null ||
    (Number.isInteger(parsedMax) && parsedMax >= 1 && parsedMax <= AI_MAX_QUESTIONS_LIMIT);
  const canGenerate =
    !generating &&
    promptLength >= AI_PROMPT_MIN_LENGTH &&
    promptLength <= AI_PROMPT_MAX_LENGTH &&
    maxValid;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setError(null);
    const req: FormGenerateRequest = {
      prompt: prompt.trim(),
      ...(type && { type }),
      ...(language.trim() && { language: language.trim() }),
      ...(parsedMax != null && { max_questions: parsedMax }),
    };
    setGenerating(true);
    try {
      const draft = await aiService.generateForm(req);
      onDraft(draft);
      setOpen(false);
    } catch (e) {
      const msg = errorMessage(e);
      showErrorToast(msg);
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="rounded-lg bg-card text-card-foreground border border-border shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Generate with AI</span>
        </span>
        <ChevronDown
          className={[
            "h-4 w-4 text-muted-foreground transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div className="px-6 pb-6 flex flex-col gap-4 border-t border-border pt-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Describe the form
            </span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={AI_PROMPT_MAX_LENGTH}
              rows={4}
              disabled={generating}
              placeholder="e.g. A customer satisfaction survey for our delivery service"
              className="px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground outline-none focus:border-primary resize-y disabled:opacity-60"
            />
            <span className="text-xs text-muted-foreground self-end">
              {prompt.length} / {AI_PROMPT_MAX_LENGTH}
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Form type
              </span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as FormType | "")}
                disabled={generating}
                className="px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">Auto</option>
                <option value="questionnaire">Questionnaire</option>
                <option value="exam">Exam</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Language
              </span>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={generating}
                placeholder="e.g. English"
                className="px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Max questions
              </span>
              <input
                type="number"
                min={1}
                max={AI_MAX_QUESTIONS_LIMIT}
                value={maxQuestions}
                onChange={(e) => setMaxQuestions(e.target.value)}
                disabled={generating}
                className={[
                  "px-3 py-2 rounded-md border bg-background text-sm text-foreground outline-none focus:border-primary",
                  maxValid ? "border-border" : "border-destructive",
                ].join(" ")}
              />
            </label>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm px-4 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {generating
                ? "Generating… this can take up to a couple of minutes."
                : "The draft replaces the current form. Nothing is saved until you click Save form."}
            </span>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="flex items-center gap-2 px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? "Generating..." : "Generate draft"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
