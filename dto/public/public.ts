export interface PublicFormField {
  id: number;
  question: string;
  type: string;
  options?: string[] | null;
  order: number;
  help_text?: string | null;
  is_required: boolean;
  section_id?: number | null;
}

export interface PublicForm {
  id: number;
  name: string;
  description: string | null;
  type: string;
  fields: PublicFormField[];
  sections?: import("@/dto/form/form").FormSection[] | null;
}

export interface PublicCustomer {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
}

export interface PublicSubmitRequest {
  customer: PublicCustomer;
  answers: Record<string, unknown>;
}

export interface PublicSubmitResponse {
  submission_id: number;
  customer_id: number;
  created_customer: boolean;
}
