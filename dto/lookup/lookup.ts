export interface LookupResult {
  id: number;
  name: string;
}

export interface PersonLookupResult extends LookupResult {
  email: string;
}
