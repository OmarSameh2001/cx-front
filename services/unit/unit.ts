import { HttpService } from "../http";
import type { Page } from "@/dto/common/page";
import type {
  UnitCreate,
  UnitRead,
  UnitSummary,
  UnitUpdate,
} from "@/dto/unit/unit";

export class UnitService extends HttpService {
  async list(organisationId: number, params?: { limit?: number; offset?: number }) {
    const entries: [string, string][] = [
      ["organisation_id", String(organisationId)],
    ];
    if (params?.limit !== undefined) entries.push(["limit", String(params.limit)]);
    if (params?.offset !== undefined) entries.push(["offset", String(params.offset)]);
    const query = "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    return this.get<Page<UnitSummary>>(`/units${query}`);
  }

  async create(payload: UnitCreate) {
    return this.post<UnitRead>("/units", payload);
  }

  async update(id: number, organisationId: number, payload: UnitUpdate) {
    return this.patch<UnitRead>(
      `/units/${id}?organisation_id=${organisationId}`,
      payload
    );
  }

  async remove(id: number, organisationId: number) {
    return this.delete<void>(`/units/${id}?organisation_id=${organisationId}`);
  }
}
