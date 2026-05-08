import { HttpService } from "../http";
import type { Page } from "@/dto/common/page";
import type {
  EmployeeCreate,
  EmployeeRead,
  EmployeeSummary,
  EmployeeUpdate,
} from "@/dto/employee/employee";

export class EmployeeService extends HttpService {
  async list(params?: { limit?: number; offset?: number }) {
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
    return this.get<Page<EmployeeSummary>>(`/employees${query}`);
  }

  async getById(id: number) {
    return this.get<EmployeeRead>(`/employees/${id}`);
  }

  async create(payload: EmployeeCreate) {
    return this.post<EmployeeRead>("/employees", payload);
  }

  async update(id: number, payload: EmployeeUpdate) {
    return this.patch<EmployeeRead>(`/employees/${id}`, payload);
  }

  async remove(id: number) {
    return this.delete<void>(`/employees/${id}`);
  }
}
