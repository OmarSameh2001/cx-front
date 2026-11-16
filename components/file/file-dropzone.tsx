"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

interface Props {
  onFile: (file: File) => void;
  accept?: string;
  hint?: string;
  disabled?: boolean;
  // 0..1 while uploading, null when idle
  progress?: number | null;
  label?: string;
}

// Click or drop a file. Shows a progress bar while `progress` is set.
export default function FileDropzone({ onFile, accept, hint, disabled, progress = null, label }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const busy = progress !== null;
  const inactive = disabled || busy;

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (file && !inactive) onFile(file);
  }

  return (
    <div
      role="button"
      tabIndex={inactive ? -1 : 0}
      aria-disabled={inactive}
      aria-label={label ?? "Upload a file"}
      onClick={() => !inactive && input.current?.click()}
      onKeyDown={(e) => {
        if (!inactive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          input.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!inactive) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        pick(e.dataTransfer.files);
      }}
      className={[
        "w-full border-2 border-dashed rounded-md p-4 sm:p-6 flex flex-col items-center justify-center gap-2 text-center transition",
        over ? "border-primary bg-primary/5" : "border-border bg-muted/30",
        inactive ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-muted/50",
      ].join(" ")}
    >
      <UploadCloud className="h-7 w-7 text-muted-foreground" />
      {busy ? (
        <div className="w-full max-w-xs flex flex-col gap-1">
          <p className="text-sm text-foreground font-medium">Uploading… {Math.round((progress ?? 0) * 100)}%</p>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground font-medium">
          <span className="hidden sm:inline">Click to upload or drag and drop</span>
          <span className="sm:hidden">Tap to upload</span>
        </p>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        disabled={inactive}
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = ""; // the same file can be picked again
        }}
      />
    </div>
  );
}
