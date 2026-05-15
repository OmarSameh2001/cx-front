import { HttpService } from "../http";
import type { Page } from "@/dto/common/page";
import type {
  OrganisationCreate,
  OrganisationRead,
  OrganisationSummary,
  OrganisationUpdate,
} from "@/dto/organisation/organisation";

export class OrganisationService extends HttpService {
  async list(params?: { limit?: number; offset?: number }) {
    const query = params
      ? "?" +
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";
    return this.get<Page<OrganisationSummary>>(`/organisations${query}`);
  }

  async getById(id: number) {
    return this.get<OrganisationRead>(`/organisations/${id}`);
  }

  async create(payload: OrganisationCreate) {
    return this.post<OrganisationRead>("/organisations", payload);
  }

  async update(id: number, payload: OrganisationUpdate) {
    return this.patch<OrganisationRead>(`/organisations/${id}`, payload);
  }

  async remove(id: number) {
    return this.delete<void>(`/organisations/${id}`);
  }
}
