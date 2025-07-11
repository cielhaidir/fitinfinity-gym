"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

interface ColumnsProps {
  onEdit: (user: any) => void;
  onDelete: (user: any) => void;
  onBypassLogin: (user: any) => void;
}

export const createColumns = ({
  onEdit,
  onDelete,
  onBypassLogin,
}: ColumnsProps): ColumnDef<any>[] => [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "roles",
    header: "Roles",
    cell: ({ row }) => {
      const roles = row.original.roles || [];
      return roles.map((role: { name: string }) => role.name).join(", ");
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(row.original)}
        >
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(row.original)}
        >
          Delete
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onBypassLogin(row.original)}
        >
          Bypass Login
        </Button>
      </div>
    ),
  },
];
