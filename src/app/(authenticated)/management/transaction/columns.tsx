"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { DataTableRowActions } from "@/components/datatable/data-table-row-actions";
import { type Transaction } from "./schema";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface ColumnsProps {
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export const transactionColumns = ({
  onEdit,
  onDelete,
}: ColumnsProps): ColumnDef<Transaction>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
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
    cell: ({ row }) => (
      <div>
        {new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
        }).format(row.getValue("amount"))}
      </div>
    ),
  },
  {
    accessorKey: "transaction_date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Transaction Date" />
    ),
    cell: ({ row }) => (
      <div>
        {new Date(row.getValue("transaction_date")).toLocaleDateString()}
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
  },
  {
    accessorKey: "file",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Transaction Proof" />
    ),
    cell: ({ row }) => {
      const file = row.getValue("file");
      const [isOpen, setIsOpen] = useState(false);

      if (!file) return <div>No file</div>;

      return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-gray-100"
            >
              <Eye className="mr-1 h-4 w-4" />
              Lihat Bukti
            </Badge>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <div className="relative h-[500px] w-full">
              {file && (
                <img
                  src={file}
                  alt="Transaction Proof"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = "/placeholder-image.png"; // Add a placeholder image
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DataTableRowActions row={row} onEdit={onEdit} onDelete={onDelete} />
    ),
  },
];
