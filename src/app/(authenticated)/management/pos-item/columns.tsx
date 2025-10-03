"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/app/_components/datatable-local/data-table-column-header";
import type { POSItem } from "./schema";
import { formatIDR } from "@/lib/format";

interface CreateColumnsProps {
  onEditModel: (item: POSItem & { category?: { name: string } }) => void;
  onDeleteModel: (item: POSItem) => void;
}

export function createColumns({
  onEditModel,
  onDeleteModel,
}: CreateColumnsProps): ColumnDef<POSItem & { category?: { name: string } }>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
    },
    {
      accessorKey: "category.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      cell: ({ row }) => {
        const categoryName = row.original.category?.name;
        return categoryName || "—";
      },
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Price" />
      ),
      cell: ({ row }) => {
        const price = row.getValue("price") as number;
        return formatIDR(price);
      },
    },
    {
      accessorKey: "cost",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cost" />
      ),
      cell: ({ row }) => {
        const cost = row.getValue("cost") as number;
        return cost ? formatIDR(cost) : "—";
      },
    },
    {
      accessorKey: "stock",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Stock" />
      ),
      cell: ({ row }) => {
        const stock = row.getValue("stock") as number;
        const minStock = row.original.minStock || 0;
        const isLowStock = stock <= minStock && minStock > 0;
        
        return (
          <Badge variant={isLowStock ? "destructive" : stock === 0 ? "secondary" : "default"}>
            {stock} {stock === 1 ? "unit" : "units"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "minStock",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Min Stock" />
      ),
      cell: ({ row }) => {
        const minStock = row.getValue("minStock") as number;
        return minStock || "—";
      },
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return (
          <Badge variant={isActive ? "default" : "destructive"}>
            {isActive ? "Active" : "Inactive"}
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
        const date = row.getValue("createdAt") as Date;
        return new Date(date).toLocaleDateString();
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const item = row.original;

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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onEditModel(item)}
                className="cursor-pointer"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeleteModel(item)}
                className="cursor-pointer text-red-600"
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
}