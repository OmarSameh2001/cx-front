"use client";

import { Trash2, Pencil, Layers, Eye, ClipboardList } from "lucide-react";
import type { TableActionButton } from "@/dto/table/table";
import { PermissionGate } from "@/components/protection/authorization";

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
  const icon = (() => {
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
      case "select":
        return (
          <button
            title="Manage Units"
            onClick={() => action?.onClick?.(row?.id, row)}
            className="cursor-pointer"
          >
            <Layers className="text-blue-500 size-5" />
          </button>
        );
      case "view":
        return (
          <button
            title="View"
            onClick={() => action?.onClick?.(row?.id, row)}
            className="cursor-pointer"
          >
            <Eye className="text-primary size-5" />
          </button>
        );
      case "submissions":
        return (
          <button
            title="View Submissions"
            onClick={() => action?.onClick?.(row?.id, row)}
            className="cursor-pointer"
          >
            <ClipboardList className="text-muted-foreground size-5" />
          </button>
        );
      default:
        return null;
    }
  })();

  if (!icon) return null;

  return action.permission ? (
    <PermissionGate permission={action.permission}>{icon}</PermissionGate>
  ) : (
    icon
  );
}
