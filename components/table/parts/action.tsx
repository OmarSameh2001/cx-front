"use client";

import { Trash2, Pencil } from "lucide-react";
import type { TableActionButton } from "@/dto/table/table";

export function TableActionIcon({
  action,
  row,
  query,
  tabelName,
}: {
  action: TableActionButton;
  row: any;
  query?: string;
  tabelName?: string;
}) {
  switch (action?.name?.toLowerCase()) {
    case "delete":
      return (
        <button
          title="Delete"
          onClick={() => action?.onClick?.(row?.id, row)}
          className="cursor-pointer"
        >
          <Trash2 className="text-red-500 size-5" />
        </button>
      );
    case "edit":
      return (
        <button
          title="Edit"
          onClick={() => action?.onClick?.(row?.id, row)}
          className="cursor-pointer"
        >
          <Pencil className="text-yellow-500 size-5" />
        </button>
      );
    default:
      return null;
  }
}
