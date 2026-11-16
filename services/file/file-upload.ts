import { HTTP_ENV } from "@/utils/config/http-env";
import { compressImage } from "@/utils/file/compress-image";
import { formatBytes } from "@/utils/file/question-limits";
import type { Page } from "@/dto/common/page";
import type {
  EffectiveLimits,
  FileLink,
  FilePurpose,
  FileRead,
  UploadStartResponse,
  UploadTarget,
} from "@/dto/file/file";
import { HttpError, HttpService, toHttpError } from "../http";

// Files never pass through the API: it hands out a signed target, the
// browser sends the bytes straight to storage (with progress), then the API
// confirms them. Images are compressed in the browser first.

export type UploadProgress = (fraction: number) => void;

export interface UploadOptions {
  onProgress?: UploadProgress;
  signal?: AbortSignal;
}

export interface UploadResult {
  file: FileRead;
  // public uploads only: goes back inside the answer
  fileToken: string | null;
}

function typeAllowed(type: string, patterns: string[]): boolean {
  return patterns.some(
    (p) => p === "*/*" || p === type || (p.endsWith("/*") && type.startsWith(p.slice(0, -1)))
  );
}

// Checks against the limits and compresses images, before anything is sent.
async function prepare(file: File, limits: EffectiveLimits): Promise<File> {
  const type = file.type || "application/octet-stream";
  if (!typeAllowed(type, limits.allowed_types)) {
    throw new HttpError(`Files of type ${file.type || "unknown"} are not allowed here.`, 415, "file_type_not_allowed");
  }
  const ready = await compressImage(file, limits.image);
  if (ready.size > limits.max_bytes) {
    throw new HttpError(
      `${file.name} is ${formatBytes(ready.size)}; the limit is ${formatBytes(limits.max_bytes)}.`,
      413,
      "file_too_large"
    );
  }
  return ready;
}

// Sends the bytes to storage with XMLHttpRequest, which (unlike fetch)
// reports upload progress.
export function sendToStorage(target: UploadTarget, file: File, opts: UploadOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(target.method, target.url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new HttpError(`Upload failed (${xhr.status}). Please try again.`, xhr.status, "upload_failed"));
    xhr.onerror = () => reject(new HttpError("Upload failed: check your connection and try again.", 0, "upload_failed"));
    xhr.onabort = () => reject(new HttpError("Upload cancelled.", 0, "upload_cancelled"));
    opts.signal?.addEventListener("abort", () => xhr.abort(), { once: true });

    if (target.method === "PUT") {
      for (const [k, v] of Object.entries(target.headers)) xhr.setRequestHeader(k, v);
      xhr.send(file);
    } else {
      const body = new FormData();
      for (const [k, v] of Object.entries(target.fields)) body.append(k, v);
      body.append("file", file);
      xhr.send(body);
    }
  });
}

/** Signed-in employees: answers to file questions, the organisation logo. */
export class FileUploadService extends HttpService {
  questionLimits(formId: number, fieldId: number) {
    return this.get<EffectiveLimits>(`/files/limits/question?form_id=${formId}&field_id=${fieldId}`);
  }

  limits(purpose: FilePurpose, organisationId?: number) {
    const q = organisationId ? `?organisation_id=${organisationId}` : "";
    return this.get<EffectiveLimits>(`/files/limits/${purpose}${q}`);
  }

  /** Upload a new file. For form answers pass formId and fieldId. */
  async add(
    file: File,
    target: { purpose: FilePurpose; formId?: number; fieldId?: number; organisationId?: number },
    opts: UploadOptions = {}
  ): Promise<UploadResult> {
    const limits =
      target.purpose === "form_answer" && target.formId && target.fieldId
        ? await this.questionLimits(target.formId, target.fieldId)
        : await this.limits(target.purpose, target.organisationId);
    const ready = await prepare(file, limits);
    const start = await this.post<UploadStartResponse>("/files/uploads", {
      purpose: target.purpose,
      name: ready.name,
      content_type: ready.type || "application/octet-stream",
      size: ready.size,
      form_id: target.formId,
      field_id: target.fieldId,
      organisation_id: target.organisationId,
    });
    await sendToStorage(start.upload, ready, opts);
    opts.onProgress?.(1);
    return { file: await this.complete(start.file.id), fileToken: null };
  }

  /** Replace a file's content; it keeps its id. */
  async update(id: number, file: File, limits: EffectiveLimits, opts: UploadOptions = {}): Promise<FileRead> {
    const ready = await prepare(file, limits);
    const start = await this.put<UploadStartResponse>(`/files/${id}/content`, {
      name: ready.name,
      content_type: ready.type || "application/octet-stream",
      size: ready.size,
    });
    await sendToStorage(start.upload, ready, opts);
    return this.complete(id);
  }

  complete(id: number) {
    return this.post<FileRead>(`/files/${id}/complete`, {});
  }

  rename(id: number, name: string) {
    return this.patch<FileRead>(`/files/${id}`, { name });
  }

  remove(id: number) {
    return this.delete<void>(`/files/${id}`);
  }

  getById(id: number) {
    return this.get<FileRead>(`/files/${id}`);
  }

  list(params: { purpose?: FilePurpose; attached_type?: string; attached_id?: number; limit?: number; offset?: number }) {
    const q = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    return this.get<Page<FileRead>>(`/files${q ? `?${q}` : ""}`);
  }

  /** A short-lived link. `inline` shows images instead of downloading. */
  link(id: number, opts: { variant?: "thumb"; inline?: boolean } = {}) {
    const q = new URLSearchParams();
    if (opts.variant) q.set("variant", opts.variant);
    if (opts.inline) q.set("inline", "true");
    const s = q.toString();
    return this.get<FileLink>(`/files/${id}/link${s ? `?${s}` : ""}`);
  }
}

/** Anonymous respondents of a public form link. */
export const PublicFileUpload = {
  async limits(token: string, fieldId: number): Promise<EffectiveLimits> {
    const res = await fetch(`${HTTP_ENV.API_URL ?? ""}/public/forms/${encodeURIComponent(token)}/fields/${fieldId}/limits`);
    if (!res.ok) throw await toHttpError(res, "Couldn't check this question's file limits.");
    return res.json();
  },

  async add(token: string, fieldId: number, file: File, opts: UploadOptions = {}): Promise<UploadResult> {
    const base = `${HTTP_ENV.API_URL ?? ""}/public/forms/${encodeURIComponent(token)}/uploads`;
    const json = { "Content-Type": "application/json" };
    const ready = await prepare(file, await PublicFileUpload.limits(token, fieldId));
    const startRes = await fetch(base, {
      method: "POST",
      headers: json,
      body: JSON.stringify({
        field_id: fieldId,
        name: ready.name,
        content_type: ready.type || "application/octet-stream",
        size: ready.size,
      }),
    });
    if (!startRes.ok) throw await toHttpError(startRes, "Couldn't start the upload.");
    const start: UploadStartResponse = await startRes.json();
    await sendToStorage(start.upload, ready, opts);
    opts.onProgress?.(1);
    const doneRes = await fetch(`${base}/${start.file.id}/complete`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ file_token: start.file_token }),
    });
    if (!doneRes.ok) throw await toHttpError(doneRes, "Couldn't finish the upload.");
    return { file: await doneRes.json(), fileToken: start.file_token };
  },
};
