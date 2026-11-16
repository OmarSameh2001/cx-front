"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, RefreshCw, X } from "lucide-react";

import FileDropzone from "@/components/file/file-dropzone";
import type { EffectiveLimits, FileAnswer } from "@/dto/file/file";
import { isFileAnswer } from "@/dto/file/file";
import { FileUploadService, PublicFileUpload } from "@/services/file/file-upload";
import { acceptAttr, formatBytes } from "@/utils/file/question-limits";
import { showErrorToast } from "@/utils/toaster/toaster";
import { useUploadContext } from "./upload-context";

interface Props {
  fieldId: number;
  value: unknown;
  onChange: (value: FileAnswer | null) => void;
  disabled?: boolean;
}

const fileService = new FileUploadService();

function describeTypes(types: string[]): string {
  if (types.length === 1 && types[0] === "application/pdf") return "PDF";
  if (types.every((t) => t.startsWith("image/"))) return "Images";
  return "";
}

// The answer to a file question: upload (images compressed first), then the
// answer holds {file_id, name, ...}. Removing or replacing the file only
// changes the answer; the server deletes files no answer uses any more.
export default function FileAnswerInput({ fieldId, value, onChange, disabled }: Props) {
  const ctx = useUploadContext();
  const [limits, setLimits] = useState<EffectiveLimits | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const answer = isFileAnswer(value) ? value : null;

  useEffect(() => {
    if (!ctx) return;
    let cancelled = false;
    const load =
      ctx.kind === "public"
        ? PublicFileUpload.limits(ctx.token, fieldId)
        : fileService.questionLimits(ctx.formId, fieldId);
    load.then((l) => !cancelled && setLimits(l)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ctx, fieldId]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const hint = useMemo(() => {
    if (!limits) return undefined;
    const kind = describeTypes(limits.allowed_types);
    return `${kind ? `${kind}, ` : ""}up to ${formatBytes(limits.max_bytes)}`;
  }, [limits]);

  async function upload(file: File) {
    if (!ctx) {
      showErrorToast("Files can't be uploaded here.");
      return;
    }
    setProgress(0);
    try {
      const result =
        ctx.kind === "public"
          ? await PublicFileUpload.add(ctx.token, fieldId, file, { onProgress: setProgress })
          : await fileService.add(file, { purpose: "form_answer", formId: ctx.formId, fieldId }, { onProgress: setProgress });
      const f = result.file;
      setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
      onChange({
        file_id: f.id,
        name: f.name,
        content_type: f.content_type,
        size: f.size,
        ...(result.fileToken ? { token: result.fileToken } : {}),
      });
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setProgress(null);
    }
  }

  if (answer && progress === null) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3 min-w-0">
          {preview ? (
            // a local preview of what was just picked
            <img src={preview} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
          ) : (
            <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground font-medium truncate">{answer.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(answer.size)}</p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                onChange(null);
              }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted shrink-0"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {!disabled && (
          <label className="inline-flex items-center gap-1.5 self-start text-xs text-primary cursor-pointer hover:underline">
            <RefreshCw className="h-3.5 w-3.5" />
            Replace file
            <input
              type="file"
              className="hidden"
              accept={acceptAttr(limits?.allowed_types)}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) upload(file);
              }}
            />
          </label>
        )}
      </div>
    );
  }

  return (
    <FileDropzone
      onFile={upload}
      accept={acceptAttr(limits?.allowed_types)}
      hint={hint}
      disabled={disabled}
      progress={progress}
      label="Upload your answer file"
    />
  );
}
