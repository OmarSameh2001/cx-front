"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Trash2 } from "lucide-react";

import FileDropzone from "@/components/file/file-dropzone";
import { FileUploadService } from "@/services/file/file-upload";
import { showErrorToast } from "@/utils/toaster/toaster";

const fileService = new FileUploadService();

interface Props {
  organisationId: number;
  // the logo link the organisation has now, if any
  currentUrl: string | null;
  onChange: (fileId: number | null) => void;
  disabled?: boolean;
}

// Upload an organisation logo (compressed in the browser, PNG/JPEG/WebP).
// The new logo is saved with the rest of the form; the old one is deleted then.
export default function LogoUpload({ organisationId, currentUrl, onChange, disabled }: Props) {
  const [progress, setProgress] = useState<number | null>(null);
  // a just-uploaded logo shown from memory, or the logo removed in this edit
  const [local, setLocal] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const preview = removed ? null : local ?? currentUrl;

  useEffect(() => () => {
    if (local) URL.revokeObjectURL(local);
  }, [local]);

  async function upload(file: File) {
    setProgress(0);
    try {
      const { file: stored } = await fileService.add(
        file,
        { purpose: "org_logo", organisationId },
        { onProgress: setProgress }
      );
      setLocal(URL.createObjectURL(file));
      setRemoved(false);
      onChange(stored.id);
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : "Logo upload failed.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
      <div className="h-20 w-20 shrink-0 rounded-md border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
        {preview ? (
          <img src={preview} alt="Organisation logo" className="h-full w-full object-contain" />
        ) : (
          <ImageIcon className="h-7 w-7 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <FileDropzone
          onFile={upload}
          accept="image/png,image/jpeg,image/webp"
          hint="PNG, JPEG or WebP"
          progress={progress}
          disabled={disabled}
          label="Upload a logo"
        />
        {preview && progress === null && !disabled && (
          <button
            type="button"
            onClick={() => {
              setRemoved(true);
              onChange(null);
            }}
            className="inline-flex items-center gap-1.5 self-start text-xs text-destructive hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove logo
          </button>
        )}
      </div>
    </div>
  );
}
