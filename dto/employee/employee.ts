export interface EmployeeCreate {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string;
  is_active?: boolean;
  external_id?: string | null;
  phone?: string | null;
  dob?: string | null;
  gender?: string | null;
  manager_id?: number | null;
  unit_id?: number | null;
  role_id?: number | null;
  assigned_units?: number[];
}

export interface EmployeeUpdate {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
  is_active?: boolean | null;
  phone?: string | null;
  dob?: string | null;
  gender?: string | null;
  external_id?: string | null;
  manager_id?: number | null;
  unit_id?: number | null;
  role_id?: number | null;
  assigned_units?: number[] | null;
}

export interface EmployeeSummary {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  is_active: boolean;
  role_id: number | null;
  role_name: string | null;
  unit_id: number | null;
  unit_name: string | null;
  organisation_id: number;
  assigned_units: number[];
}

export interface EmployeeRead {
  id: number;
  external_id: string | null;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  is_active: boolean;
  phone: string | null;
  dob: string | null;
  gender: string | null;
  profile_picture: string | null;
  manager_id: number | null;
  unit_id: number | null;
  organisation_id: number;
  role_id: number | null;
  assigned_units: number[];
}
