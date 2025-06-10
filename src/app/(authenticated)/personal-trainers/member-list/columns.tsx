"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { type Member } from "./schema";

import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Edit } from "lucide-react";

export const getColumns = (
  onEdit: (member: Member) => void,
): ColumnDef<Member>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Member Name" />
    ),
    cell: ({ row }) => <div className="w-[150px]">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => (
      <div className="hidden md:block">{row.getValue("email")}</div>
    ),
  },
  {
    accessorKey: "phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone" />
    ),
    cell: ({ row }) => (
      <div className="hidden md:block">{row.getValue("phone")}</div>
    ),
  },
  {
    accessorKey: "birthDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Age" />
    ),
    cell: ({ row }) => {
      const birthDateString = row.getValue("birthDate");
      if (!birthDateString) {
        return <div className="w-[80px]">-</div>;
      }
      const birthDate = new Date(birthDateString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      return <div className="w-[80px]">{age}</div>;
    },
  },
  {
    accessorKey: "remainingSessions",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Remaining Sessions" />
    ),
    cell: ({ row }) => (
      <div className="w-[100px]">{row.getValue("remainingSessions")}</div>
    ),
  },
  {
    accessorKey: "subscriptionEndDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Subscription End Date" />
    ),
    cell: ({ row }) => (
      <div className="hidden w-[150px] md:block">
        {new Date(row.getValue("subscriptionEndDate")).toLocaleDateString()}
      </div>
    ),
  },
  {
    accessorKey: "height",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Height (cm)" />
    ),
    cell: ({ row }) => (
      <div className="w-[100px]">
        {row.getValue("height") ? `${row.getValue("height")} cm` : "-"}
      </div>
    ),
  },
  {
    accessorKey: "weight",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Weight (kg)" />
    ),
    cell: ({ row }) => (
      <div className="w-[100px]">
        {row.getValue("weight") ? `${row.getValue("weight")} kg` : "-"}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const remainingSessions = row.original.remainingSessions;
      return (
        <div className="w-[100px]">
          <Badge
            variant={remainingSessions > 0 ? "default" : "destructive"}
            className={
              remainingSessions > 0 ? "bg-[#C9D953] hover:bg-[#B8C84A]" : ""
            }
          >
            {remainingSessions > 0 ? "Active" : "Inactive"}
          </Badge>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex gap-2">
        <button
          className="flex items-center justify-center p-2 text-white"
          onClick={() => onEdit(row.original)}
          title="Edit"
        >
          <Edit className="h-4 w-4" />
        </button>
      </div>
    ),
  },
];
