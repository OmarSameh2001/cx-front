export interface PermissionCreate {
  resource: string;
  action: string;
}

export interface PermissionRead extends PermissionCreate {
  id: number;
}

export interface RoleCreate {
  name: string;
  is_system?: boolean;
  permission_ids?: number[];
}

export interface RoleUpdate {
  name?: string | null;
}

export interface RolePermissionsReplace {
  permission_ids: number[];
}

export interface RolePermissionsAdd {
  permission_ids: number[];
}

export interface RoleSummary {
  id: number;
  name: string;
  is_system: boolean;
}

export interface RoleRead {
  id: number;
  name: string;
  is_system: boolean;
  permissions: PermissionRead[];
}

export interface SeedResult {
  created: PermissionRead[];
  existing: number;
}
