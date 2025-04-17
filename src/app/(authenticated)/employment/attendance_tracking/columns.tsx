"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Attendance } from "./schema";
import { format } from "date-fns";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";

export const columns: ColumnDef<Attendance>[] = [
  {
    accessorKey: "employee.user.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Employee Name" />
    ),
    cell: ({ row }) => {
      const name = row.original.employee.user.name;
      return <div className="w-[150px]">{name || "-"}</div>;
    },
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => {
      const date = row.original.date;
      return <div className="w-[120px]">{format(date, "PP")}</div>;
    },
  },
  {
    accessorKey: "checkIn",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Check In" />
    ),
    cell: ({ row }) => {
      const checkIn = row.original.checkIn;
      return <div className="w-[100px]">{format(checkIn, "HH:mm")}</div>;
    },
  },
  {
    accessorKey: "checkOut",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Check Out" />
    ),
    cell: ({ row }) => {
      const checkOut = row.original.checkOut;
      return <div className="w-[100px]">{checkOut ? format(checkOut, "HH:mm") : "-"}</div>;
    },
  },
]; 