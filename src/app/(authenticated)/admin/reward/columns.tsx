"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { Badge } from "@/components/ui/badge";

export type MemberReward = {
  id: string;
  member: {
    name: string | null;
    point: number;
  };
  reward: {
    name: string;
    price: number;
  };
  claimedAt: Date;
};

export const createColumns = (): ColumnDef<MemberReward>[] => [
  {
    accessorKey: "member.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Member Name" />
    ),
    cell: ({ row }) => <div>{row.original.member.name}</div>,
  },
  {
    accessorKey: "reward.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Reward Name" />
    ),
    cell: ({ row }) => <div>{row.original.reward.name}</div>,
  },
  {
    accessorKey: "reward.price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Reward Points" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.reward.price} points</Badge>
    ),
  },
  {
    accessorKey: "claimedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Claimed At" />
    ),
    cell: ({ row }) => (
      <div>{new Date(row.original.claimedAt).toLocaleDateString()}</div>
    ),
  },
];
