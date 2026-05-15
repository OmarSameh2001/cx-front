import { HttpService } from "../http";
import type { Page } from "@/dto/common/page";
import type {
  SubmissionDetail,
  SubmissionDraftUpdate,
  SubmissionFinalize,
  SubmissionRead,
  SubmissionStartRequest,
} from "@/dto/submission/submission";

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

export class SubmissionService extends HttpService {
  async list(params?: {
    form_id?: number;
    mine_only?: boolean;
    status_in?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.get<Page<SubmissionRead>>(`/submissions${buildQuery(params)}`);
  }

  async listMine(params?: {
    form_id?: number;
    status_in?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.get<Page<SubmissionRead>>(
      `/submissions/mine${buildQuery(params)}`
    );
  }

  async getById(id: number) {
    return this.get<SubmissionRead>(`/submissions/${id}`);
  }

  async getDetail(id: number) {
    return this.get<SubmissionDetail>(`/submissions/${id}/detail`);
  }

  async start(payload: SubmissionStartRequest) {
    return this.post<SubmissionRead>("/submissions/start", payload);
  }

  async saveDraft(id: number, payload: SubmissionDraftUpdate) {
    return this.patch<SubmissionRead>(`/submissions/${id}/draft`, payload);
  }

  async submit(id: number, payload: SubmissionFinalize) {
    return this.post<SubmissionRead>(`/submissions/${id}/submit`, payload);
  }

  async reveal(id: number) {
    return this.post<SubmissionRead>(`/submissions/${id}/reveal`, {});
  }

  async remove(id: number) {
    return this.delete<void>(`/submissions/${id}`);
  }
}
