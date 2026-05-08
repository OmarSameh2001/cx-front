import { HttpService } from "../http";
import type { Page } from "@/dto/common/page";
import type {
  SubmissionCreate,
  SubmissionRead,
  SubmissionUpdate,
} from "@/dto/submission/submission";

export class SubmissionService extends HttpService {
  async list(params?: {
    form_id?: number;
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
    return this.get<Page<SubmissionRead>>(`/submissions${query}`);
  }

  async getById(id: number) {
    return this.get<SubmissionRead>(`/submissions/${id}`);
  }

  async create(payload: SubmissionCreate) {
    return this.post<SubmissionRead>("/submissions", payload);
  }

  async update(id: number, payload: SubmissionUpdate) {
    return this.patch<SubmissionRead>(`/submissions/${id}`, payload);
  }

  async remove(id: number) {
    return this.delete<void>(`/submissions/${id}`);
  }
}
