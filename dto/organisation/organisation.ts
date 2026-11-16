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
  // a short-lived link to the uploaded logo, else an external URL
  logo: string | null;
  logo_file_id: number | null;
  logo_thumb: string | null;
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

export type OrganisationUpdate = Partial<OrganisationCreate> & {
  // an uploaded org_logo file; null removes the uploaded logo
  logo_file_id?: number | null;
};
