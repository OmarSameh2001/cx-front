"use client";

import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";

import type { FileAnswer } from "@/dto/file/file";
import { FileUploadService } from "@/services/file/file-upload";
import { formatBytes } from "@/utils/file/question-limits";
import { showErrorToast } from "@/utils/toaster/toaster";

const fileService = new FileUploadService();

// A file answer in a response: name, size, a thumbnail for images, and a
// download button. Links are fetched when needed (they expire in minutes).
export default function FileAnswerView({ answer }: { answer: FileAnswer }) {
  const [thumb, setThumb] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const isImage = answer.content_type.startsWith("image/");

  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    // the thumbnail when the server made one, else the image itself
    fileService
      .link(answer.file_id, { variant: "thumb", inline: true })
      .catch(() => fileService.link(answer.file_id, { inline: true }))
      .then((l) => !cancelled && setThumb(l.url))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [answer.file_id, isImage]);

  async function download() {
    setDownloading(true);
    try {
      const { url } = await fileService.link(answer.file_id);
      // the link forces a download with the file's name
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : "Couldn't download the file.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3 min-w-0">
      {thumb ? (
        <img src={thumb} alt={answer.name} className="h-14 w-14 rounded object-cover shrink-0" />
      ) : (
        <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground font-medium truncate">{answer.name}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(answer.size)}</p>
      </div>
      <button
        type="button"
        onClick={download}
        disabled={downloading}
        // the text is hidden on phones; keep a name for screen readers
        aria-label={`Download ${answer.name}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60 shrink-0"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{downloading ? "Opening…" : "Download"}</span>
      </button>
    </div>
  );
}
