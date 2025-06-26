"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { type Class } from "./schema";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface ColumnsProps {
  onEdit: (class_: Class) => void;
  onDelete: (class_: Class) => void;
}

export const columns = ({
  onEdit,
  onDelete,
}: ColumnsProps): ColumnDef<Class>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Class Name" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "limit",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Student Limit" />
    ),
    cell: ({ row }) => (
      <div className="hidden md:block">
        {row.getValue("limit") || "No limit"}
      </div>
    ),
  },
  {
    accessorKey: "trainer.user.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Instructor" />
    ),
    cell: ({ row }) => (
      <div className="hidden md:block">
        {row.original.instructorName || "N/A"}
      </div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" />
    ),
    cell: ({ row }) => (
      <div className="hidden md:block">
        {new Date(row.getValue("createdAt")).toLocaleDateString()}
      </div>
    ),
  },
  {
    accessorKey: "schedule",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Schedule" />
    ),
    cell: ({ row }) => (
      <div className="">
        {new Date(row.getValue("schedule")).toLocaleString("id-ID", {
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    ),
  },
  // {
  //   accessorKey: "duration",
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title="Duration" />
  //   ),
  //   cell: ({ row }) => (
  //     <div className="hidden md:block">{row.getValue("duration")} minutes</div>
  //   ),
  // },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" />
    ),
    cell: ({ row }) => (
      <div className="hidden md:block">
        Rp {((row.getValue("price")) || 0).toLocaleString()}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => onEdit(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => onDelete(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          {/* Mobile actions */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onEdit(row.original)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    },
  },
];
