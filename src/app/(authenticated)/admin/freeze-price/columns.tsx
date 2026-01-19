"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";

export type FreezePrice = {
  id: string;
  freezeDays: number;
  price: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

interface CreateColumnsProps {
  onEdit: (freezePrice: FreezePrice) => void;
  onDelete: (freezePrice: FreezePrice) => void;
  onToggleActive: (freezePrice: FreezePrice) => void;
}

export const createColumns = ({
  onEdit,
  onDelete,
  onToggleActive,
}: CreateColumnsProps): ColumnDef<FreezePrice>[] => [
  {
    accessorKey: "freezeDays",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Freeze Days" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.freezeDays} {row.original.freezeDays === 1 ? "Day" : "Days"}
      </div>
    ),
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" />
    ),
    cell: ({ row }) => {
      const formatted = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(row.original.price);
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const isActive = row.original.isActive;
      return (
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? (
            <>
              <CheckCircle className="mr-1 h-3 w-3" />
              Active
            </>
          ) : (
            <>
              <XCircle className="mr-1 h-3 w-3" />
              Inactive
            </>
          )}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" />
    ),
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {new Date(row.original.createdAt).toLocaleDateString("id-ID", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </div>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const freezePrice = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(freezePrice)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive(freezePrice)}>
              {freezePrice.isActive ? (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Deactivate
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Activate
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(freezePrice)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];