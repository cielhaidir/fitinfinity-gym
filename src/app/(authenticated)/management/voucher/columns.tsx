"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { type Voucher } from "./schema";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { format } from "date-fns";

interface ColumnsProps {
  onEditVoucher: (voucher: Voucher) => void;
  onDeleteVoucher: (voucher: Voucher) => void;
}

export const createColumns = ({
  onEditVoucher,
  onDeleteVoucher,
}: ColumnsProps): ColumnDef<Voucher>[] => [
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
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => <div>{row.getValue("type")}</div>,
  },
  {
    accessorKey: "discountType",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Discount Type" />
    ),
    cell: ({ row }) => <div>{row.getValue("discountType")}</div>,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => {
      const amount = row.getValue("amount") as number;
      const discountType = row.getValue("discountType") as string;
      return (
        <div>
          {discountType === "PERCENT"
            ? `${amount}%`
            : `Rp ${amount.toLocaleString()}`}
        </div>
      );
    },
  },
  {
    accessorKey: "maxClaim",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Max Claim" />
    ),
    cell: ({ row }) => <div>{row.getValue("maxClaim")}</div>,
  },
  {
    accessorKey: "minimumPurchase",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Min Purchase" />
    ),
    cell: ({ row }) => {
      const minimumPurchase = row.getValue("minimumPurchase") as number | null;
      return (
        <div>
          {minimumPurchase && minimumPurchase > 0
            ? `Rp ${minimumPurchase.toLocaleString()}`
            : "No minimum"}
        </div>
      );
    },
  },
  {
    accessorKey: "allowStack",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Allow Stack" />
    ),
    cell: ({ row }) => (
      <Badge variant={row.getValue("allowStack") ? "default" : "secondary"}>
        {row.getValue("allowStack") ? "Yes" : "No"}
      </Badge>
    ),
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <Badge variant={row.getValue("isActive") ? "default" : "secondary"}>
        {row.getValue("isActive") ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    accessorKey: "expiryDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Expiry Date" />
    ),
    cell: ({ row }) => {
      const expiryDate = row.getValue("expiryDate") as Date | null;
      return (
        <div>
          {expiryDate
            ? format(new Date(expiryDate), "dd/MM/yyyy")
            : "No expiry"}
        </div>
      );
    },
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
            onClick={() => onEditVoucher(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => onDeleteVoucher(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          {/* Mobile actions */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onEditVoucher(row.original)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    },
  },
];
