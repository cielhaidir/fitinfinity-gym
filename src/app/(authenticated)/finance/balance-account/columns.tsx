"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { type BalanceAccount } from "./schema";

interface ColumnOptions {
  onEditAccount: (account: BalanceAccount) => void;
  onDeleteAccount: (account: BalanceAccount) => void;
}

export const createColumns = ({
  onEditAccount,
  onDeleteAccount,
}: ColumnOptions): ColumnDef<BalanceAccount>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "account_number",
    header: "Account Number",
    cell: ({ row }) => <div>{row.getValue("account_number")}</div>,
  },
  {
    accessorKey: "initialBalance",
    header: "Initial balance",
    cell: ({ row }) => {
          const amount = row.getValue("initialBalance") as number;
          return (
            <div>
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
              }).format(amount)}
            </div>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
      const account = row.original;

      return (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEditAccount(account)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeleteAccount(account)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
