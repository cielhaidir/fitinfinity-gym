"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { type Class } from "./schema";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Ban } from "lucide-react";

interface ColumnsProps {
  onEdit: (class_: Class) => void;
  onDelete: (class_: Class) => void;
  onCancel?: (class_: Class, sessionCounted: boolean) => void;
}

export const columns = ({
  onEdit,
  onDelete,
  onCancel,
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
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status ?? "SCHEDULED";
      const sessionCounted = row.original.sessionCounted;
      if (status === "CANCELLED") {
        return (
          <Badge variant="destructive" className="text-xs">
            Dibatalkan{sessionCounted === false ? " (sesi tidak dihitung)" : " (sesi dihitung)"}
          </Badge>
        );
      }
      return <Badge className="bg-green-600 text-xs">Aktif</Badge>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const status = row.original.status ?? "SCHEDULED";
      const isCancelled = status === "CANCELLED";
      return (
        <div className="flex items-center justify-end gap-1">
          {!isCancelled && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(row.original)}
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-orange-500 hover:text-orange-600"
                onClick={() => onCancel?.(row.original, true)}
                title="Batalkan class"
              >
                <Ban className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(row.original)}
            title="Hapus"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
