"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { type Member } from "./schema";

import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { Edit } from "lucide-react";

export const getColumns = (
  onEdit: (member: Member) => void,
): ColumnDef<Member>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Member Name" />
    ),
    cell: ({ row }) => <div className="w-[150px] px-2 py-1 text-xs sm:text-sm">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "packageName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Package" />
    ),
    cell: ({ row }) => (
      <div className="w-[150px] px-2 py-1 text-xs sm:text-sm">{row.original.packageName || "-"}</div>
    ),
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => (
      <div className="w-[150px] px-2 py-1 text-xs sm:text-sm">{row.getValue("email")}</div>
    ),
  },
  {
    accessorKey: "phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone" />
    ),
    cell: ({ row }) => (
      <div className="w-[120px] px-2 py-1 text-xs sm:text-sm">{row.getValue("phone")}</div>
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
        return <div className="w-[80px] px-2 py-1 text-xs sm:text-sm">-</div>;
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
      return <div className="w-[80px] px-2 py-1 text-xs sm:text-sm">{age}</div>;
    },
  },
  {
    accessorKey: "remainingSessions",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Remaining Sessions" />
    ),
    cell: ({ row }) => (
      <div className="w-[100px] px-2 py-1 text-xs sm:text-sm">{row.getValue("remainingSessions")}</div>
    ),
  },
  {
    accessorKey: "subscriptionEndDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Subscription End Date" />
    ),
    cell: ({ row }) => {
      const endDate = row.getValue("subscriptionEndDate") as string;
      return (
        <div className="w-[150px] px-2 py-1 text-xs sm:text-sm">
          {endDate ? new Date(endDate).toLocaleDateString() : "-"}
        </div>
      );
    },
  },
  {
    accessorKey: "height",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Height (cm)" />
    ),
    cell: ({ row }) => (
      <div className="w-[100px] px-2 py-1 text-xs sm:text-sm">
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
      <div className="w-[100px] px-2 py-1 text-xs sm:text-sm">
        {row.getValue("weight") ? `${row.getValue("weight")} kg` : "-"}
      </div>
    ),
  },

  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex gap-2 px-2 py-1 text-xs sm:text-sm">
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
