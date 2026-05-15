import { HttpService } from "../http";
import type { Page } from "@/dto/common/page";
import type {
  AssignedFormSummary,
  FormCreatePayload,
  FormRead,
  FormSummary,
  MyStatus,
} from "@/dto/form/form";

function buildQuery(params?: Record<string, unknown>) {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return "";
  return (
    "?" +
    entries
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
      )
      .join("&")
  );
}

export class FormService extends HttpService {
  async list(params?: {
    is_active?: boolean;
    is_archived?: boolean;
    submitter_type?: string;
    created_by?: number;
    name?: string;
    form_type?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.get<Page<FormSummary>>(`/forms${buildQuery(params)}`);
  }

  async listAssignedToMe(params?: {
    my_status?: MyStatus;
    name?: string;
    form_type?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.get<Page<AssignedFormSummary>>(
      `/forms/assigned-to-me${buildQuery(params)}`
    );
  }

  async getById(id: number) {
    return this.get<FormRead>(`/forms/${id}`);
  }

  async create(payload: FormCreatePayload) {
    return this.post<FormRead>("/forms", payload);
  }

  async update(id: number, payload: Partial<FormCreatePayload>) {
    return this.patch<FormRead>(`/forms/${id}`, payload);
  }

  async activate(id: number) {
    return this.post<FormRead>(`/forms/${id}/activate`, {});
  }

  async deactivate(id: number) {
    return this.post<FormRead>(`/forms/${id}/deactivate`, {});
  }

  async revealResults(id: number) {
    return this.post<FormRead>(`/forms/${id}/reveal-results`, {});
  }

  async rotatePublicToken(id: number) {
    return this.post<FormRead>(`/forms/${id}/public-token`, {});
  }

  async revokePublicToken(id: number) {
    return this.delete<FormRead>(`/forms/${id}/public-token`);
  }
}
