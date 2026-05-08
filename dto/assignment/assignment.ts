export interface AssignmentCreate {
  user_id: number;
  unit_id: number;
  description?: string | null;
}

export interface AssignmentUpdate {
  user_id?: number | null;
  unit_id?: number | null;
  description?: string | null;
}

export interface AssignmentRead {
  id: number;
  user_id: number;
  unit_id: number;
  description: string | null;
  assigned_at: string;
  assigned_by: number | null;
}
