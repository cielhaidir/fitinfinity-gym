"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header"
import { DataTableRowActions } from "@/components/datatable/data-table-row-actions"
import { Transaction } from "./schema"

interface ColumnsProps {
  onEdit: (transaction: Transaction) => void,
  onDelete: (transaction: Transaction) => void,
}

export const transactionColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Transaction>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "transaction_number",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Transaction Number" />
    ),
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
  },
  {
    accessorKey: "bank.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Bank Account" />
    ),
    cell: ({ row }) => <div>{row.original.bank?.name || "N/A"}</div>,
  },
  {
    accessorKey: "account.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Chart Account" />
    ),
    cell: ({ row }) => <div>{row.original.account?.name || "N/A"}</div>,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => <div>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(row.getValue("amount"))}</div>,
  },
  {
    accessorKey: "transaction_date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Transaction Date" />
    ),
    cell: ({ row }) => <div>{new Date(row.getValue("transaction_date")).toLocaleDateString()}</div>,
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} onEdit={onEdit} onDelete={onDelete} />,
  },
]