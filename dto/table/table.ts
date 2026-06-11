// import { AxiosResponse } from "axios";

export interface TableColumn {
    key: string;
    name: string;
    type: string;
}

// src/app/_dto/filters.ts or wherever you keep your column definitions

export interface FilterableField {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "boolean" | "id" | "sort";
  choices?: string[];
  searchType?: "search"; // For foreign key relations
  searchLabel?: string; // Label for search dropdown
  adminOnly?: boolean;
}

export interface TableActionButton {
  name: string;
  onClick?: (
    id: number,
    value?: any
  ) => Promise<any> | void;
  permission?: string;
}

export interface PaginationProps {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  hasNextPage: boolean;
  itemsPerPage: number;
  setItemsPerPage: (items: number) => void;
}
export interface TableProps {
  name: string;
  columns: any[];
  data: any[];
  actions?: TableActionButton[];
  loading: boolean;
  query: string;
  addNew?: () => void;
  addNewPermission?: string;
  buttonName?: string;
  pagination: PaginationProps;
  base: string;
}

