// Mirrors cx-api/modules/files/dto.py.

export type FilePurpose = "form_answer" | "org_logo";

export interface ImagePolicy {
  compress: boolean;
  max_side: number;
  quality: number;
  format: "webp" | "jpeg" | "png" | "keep";
  keep_original: boolean;
  thumb_side: number;
}

export interface FileRead {
  id: number;
  purpose: FilePurpose;
  name: string;
  content_type: string;
  size: number;
  status: "pending" | "ready" | "deleted";
  width: number | null;
  height: number | null;
  processing: "none" | "pending" | "done" | "skipped" | "failed";
  has_thumbnail: boolean;
  attached_type: string | null;
  attached_id: number | null;
  form_id: number | null;
  field_id: number | null;
  owner_employee_id: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface UploadTarget {
  method: "PUT" | "POST";
  url: string;
  headers: Record<string, string>;
  fields: Record<string, string>;
  expires_at: string;
}

export interface UploadStartResponse {
  file: FileRead;
  upload: UploadTarget;
  image: ImagePolicy | null;
  // public uploads only: proves the respondent owns the file
  file_token: string | null;
}

export interface FileLink {
  url: string;
  expires_at: string;
}

export interface EffectiveLimits {
  purpose: FilePurpose;
  max_bytes: number;
  max_mb: number;
  allowed_types: string[];
  image: ImagePolicy;
  hard_max_mb: number;
}

// What a file question's answer holds. `token` only for public respondents.
export interface FileAnswer {
  file_id: number;
  name: string;
  content_type: string;
  size: number;
  token?: string;
}

export function isFileAnswer(v: unknown): v is FileAnswer {
  return typeof v === "object" && v !== null && typeof (v as FileAnswer).file_id === "number";
}
