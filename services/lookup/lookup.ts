import { HttpService } from "../http";
import type { LookupResult, PersonLookupResult } from "@/dto/lookup/lookup";

function buildQuery(search?: string, limit = 20) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("limit", String(limit));
  return params.toString();
}

export class LookupService extends HttpService {
  async units(search?: string, limit = 20) {
    return this.get<LookupResult[]>(`/lookups/units?${buildQuery(search, limit)}`);
  }

  async forms(search?: string, limit = 20) {
    return this.get<LookupResult[]>(`/lookups/forms?${buildQuery(search, limit)}`);
  }

  async roles(search?: string, limit = 20) {
    return this.get<LookupResult[]>(`/lookups/roles?${buildQuery(search, limit)}`);
  }

  async employees(search?: string, limit = 20) {
    return this.get<PersonLookupResult[]>(`/lookups/employees?${buildQuery(search, limit)}`);
  }

  async customers(search?: string, limit = 20) {
    return this.get<PersonLookupResult[]>(`/lookups/customers?${buildQuery(search, limit)}`);
  }
}
