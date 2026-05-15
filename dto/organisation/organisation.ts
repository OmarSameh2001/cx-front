export type OrganisationSummary = {
  id: number;
  name: string;
  industry: string | null;
  subscription_end: string | null;
  subscription_plan_id: number | null;
};

export type OrganisationRead = {
  id: number;
  external_id: string | null;
  name: string;
  logo: string | null;
  industry: string | null;
  contact_info: string | null;
  subscription_end: string | null;
  subscription_plan_id: number | null;
};

export type OrganisationCreate = {
  name: string;
  logo?: string | null;
  industry?: string | null;
  contact_info?: string | null;
  subscription_end?: string | null;
  subscription_plan_id?: number | null;
  external_id?: string | null;
};

export type OrganisationUpdate = Partial<OrganisationCreate>;
