export type UnitSummary = {
  id: number;
  name: string;
  type: string | null;
  is_active: boolean;
  organisation_id: number;
  parent_unit_id: number | null;
};

export type UnitRead = {
  id: number;
  external_id: string | null;
  name: string;
  type: string | null;
  contact_info: string | null;
  is_active: boolean;
  organisation_id: number;
  parent_unit_id: number | null;
};

export type UnitCreate = {
  name: string;
  organisation_id: number;
  type?: string | null;
  contact_info?: string | null;
  is_active?: boolean;
  parent_unit_id?: number | null;
  external_id?: string | null;
};

export type UnitUpdate = {
  name?: string;
  type?: string | null;
  contact_info?: string | null;
  is_active?: boolean;
  parent_unit_id?: number | null;
  external_id?: string | null;
};
