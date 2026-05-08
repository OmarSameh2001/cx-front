import { HttpService } from "../http";
import type { Page } from "@/dto/common/page";
import type {
  PermissionCreate,
  PermissionRead,
  RoleCreate,
  RolePermissionsAdd,
  RolePermissionsReplace,
  RoleRead,
  RoleSummary,
  RoleUpdate,
  SeedResult,
} from "@/dto/role/role";

export class RoleService extends HttpService {
  async listPermissions() {
    return this.get<PermissionRead[]>("/roles/permissions");
  }

  async createPermission(payload: PermissionCreate) {
    return this.post<PermissionRead>("/roles/permissions", payload);
  }

  async seedPermissions() {
    return this.post<SeedResult>("/roles/permissions/seed", {});
  }

  async removePermissionById(id: number) {
    return this.delete<void>(`/roles/permissions/${id}`);
  }

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
    return this.get<Page<RoleSummary>>(`/roles${query}`);
  }

  async create(payload: RoleCreate) {
    return this.post<RoleRead>("/roles", payload);
  }

  async getById(id: number) {
    return this.get<RoleRead>(`/roles/${id}`);
  }

  async update(id: number, payload: RoleUpdate) {
    return this.patch<RoleRead>(`/roles/${id}`, payload);
  }

  async remove(id: number) {
    return this.delete<void>(`/roles/${id}`);
  }

  async replacePermissions(id: number, payload: RolePermissionsReplace) {
    return this.put<RoleRead>(`/roles/${id}/permissions`, payload);
  }

  async addPermissions(id: number, payload: RolePermissionsAdd) {
    return this.post<RoleRead>(`/roles/${id}/permissions`, payload);
  }

  async removePermission(roleId: number, permissionId: number) {
    return this.delete<void>(`/roles/${roleId}/permissions/${permissionId}`);
  }
}
