import { Permission } from "../permission/permissions";

export type UserResponse = {
  id: number;
  organisation_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role_id: number;
  role: string;
  unit_id: number;
  assigned_unit_ids: number[];
  permissions: string[];
};

export type LoginResponse = {
  user: UserResponse;
};
