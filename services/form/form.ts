import { HttpService } from "../http";
import type { Page } from "@/dto/common/page";
import type {
  FormCreatePayload,
  FormRead,
  FormSummary,
} from "@/dto/form/form";

export class FormService extends HttpService {
  async list(params?: {
    is_active?: boolean;
    is_archived?: boolean;
    submitter_type?: string;
    created_by?: number;
    limit?: number;
    offset?: number;
  }) {
    const query = params
      ? "?" +
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(
            ([k, v]) =>
              `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
          )
          .join("&")
      : "";
    return this.get<Page<FormSummary>>(`/forms${query}`);
  }

  async getById(id: number) {
    return this.get<FormRead>(`/forms/${id}`);
  }

  async create(payload: FormCreatePayload) {
    return this.post<FormRead>("/forms", payload);
  }

  async update(id: number, payload: FormCreatePayload) {
    return this.put<FormRead>(`/forms/${id}`, payload);
  }
}
