"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { type UserEmployee } from "./schema";
import { Badge } from "@/components/ui/badge";

type ColumnsProps = {
  handleEdit: (employee: UserEmployee) => void;
  handleDelete: (id: string) => React.ReactNode;
};

export const getColumns = ({
  handleEdit,
  handleDelete,
}: ColumnsProps): ColumnDef<UserEmployee>[] => [
  {
    accessorKey: "user.name",
    header: "Name",
  },
  {
    accessorKey: "user.email",
    header: "Email",
  },
  {
    accessorKey: "position",
    header: "Position",
  },
  {
    accessorKey: "department",
    header: "Department",
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={row.getValue("isActive") ? "default" : "secondary"}
        className={
          row.getValue("isActive") ? "bg-[#C9D953] hover:bg-[#B8C84A]" : ""
        }
      >
        {row.getValue("isActive") ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleEdit(row.original)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = `/management/employee/attendance-history?employeeId=${row.original.id}`;
          }}
        >
          History
        </Button>
        {handleDelete(row.original.id!)}
      </div>
    ),
  },
];
