"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/app/_components/datatable/data-table-column-header";
import { DataTableRowActions } from "@/app/_components/datatable/data-table-row-actions";
import { Badge } from "@/app/_components/ui/badge";
import type { FcMember } from "@prisma/client";

export type FC_Member = FcMember & {
  onEdit?: (member: FcMember) => void;
  onDelete?: (member: FcMember) => void;
};

const getStatusColor = (status: string) => {
  const colors = {
    new: "bg-blue-500",
    contacted: "bg-yellow-500",
    follow_up: "bg-purple-500",
    interested: "bg-green-500",
    not_interested: "bg-red-500",
    pending: "bg-orange-500",
    scheduled: "bg-indigo-500",
    converted: "bg-emerald-500",
    rejected: "bg-rose-500",
    inactive: "bg-gray-500",
  };
  return colors[status as keyof typeof colors] || "bg-gray-500";
};

export const columns = (
  onEdit?: (member: FcMember) => void,
  onDelete?: (member: FcMember) => void,
): ColumnDef<FC_Member>[] => [
  {
    accessorKey: "member_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    accessorKey: "member_phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone" />
    ),
  },
  {
    accessorKey: "member_email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status");
      return (
        <Badge className={`${getStatusColor(status)} text-white`}>
          {status.replace("_", " ")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <DataTableRowActions
          row={row}
          onEdit={() => onEdit?.(row.original)}
          onDelete={() => onDelete?.(row.original)}
        />
      );
    },
  },
];
