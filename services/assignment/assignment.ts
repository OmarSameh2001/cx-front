import { HttpService } from "../http";
import type { Page } from "@/dto/common/page";
import type {
  AssignmentCreate,
  AssignmentRead,
  AssignmentUpdate,
} from "@/dto/assignment/assignment";

export class AssignmentService extends HttpService {
  async list(params?: {
    user_id?: number;
    unit_id?: number;
    assigned_by?: number;
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
    return this.get<Page<AssignmentRead>>(`/assignments${query}`);
  }

  async getById(id: number) {
    return this.get<AssignmentRead>(`/assignments/${id}`);
  }

  async create(payload: AssignmentCreate) {
    return this.post<AssignmentRead>("/assignments", payload);
  }

  async update(id: number, payload: AssignmentUpdate) {
    return this.patch<AssignmentRead>(`/assignments/${id}`, payload);
  }

  async remove(id: number) {
    return this.delete<void>(`/assignments/${id}`);
  }
}
