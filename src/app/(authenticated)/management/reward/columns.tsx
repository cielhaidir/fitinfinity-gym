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
import { DataTableRowActions } from "@/components/datatable/data-table-row-actions";
import { Badge } from "@/components/ui/badge";

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
      <DataTableColumnHeader column={column} title="Points Required" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.getValue("price")} points
      </Badge>
    ),
  },
  {
    accessorKey: "stock",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stock" />
    ),
    cell: ({ row }) => (
      <Badge variant={row.getValue("stock") > 0 ? "success" : "destructive"}>
        {row.getValue("stock")} available
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const reward = row.original;

      return (
        <DataTableRowActions
          row={row}
          actions={[
            {
              label: "Edit",
              onClick: () => onEditReward(reward),
            },
          ]}
        />
      );
    },
  },
]; 