"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Reward } from "./schema";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as LucideIcons from "lucide-react";

type ColumnsProps = {
  onEditReward: (reward: Reward) => void;
  onDeleteReward: (reward: Reward) => void;
};

export const createColumns = ({
  onEditReward,
  onDeleteReward,
}: ColumnsProps): ColumnDef<Reward>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "iconName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Icon" />
    ),
    cell: ({ row }) => {
      const iconName = row.getValue("iconName") as string;
      const IconComponent = (LucideIcons as unknown as Record<string, React.FC<any>>)[iconName];
      return (
        <div className="flex items-center">
          {IconComponent ? <IconComponent className="h-5 w-5 mr-2" /> : null}
          {iconName}
        </div>
      );
    },
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" />
    ),
    cell: ({ row }) => (
      <div>{new Intl.NumberFormat("id-ID").format(row.getValue("price"))} Points</div>
    ),
  },
  {
    accessorKey: "stock",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stock" />
    ),
    cell: ({ row }) => <div>{row.getValue("stock")}</div>,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const reward = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditReward(reward)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDeleteReward(reward)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
]; 