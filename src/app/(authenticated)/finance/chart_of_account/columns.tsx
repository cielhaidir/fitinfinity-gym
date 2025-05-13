"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface ChartAccount {
  id: number;
  reff: string;
  name: string;
  type: string;
  flow: "income" | "outcome" | "both";
}

export const columns: ColumnDef<ChartAccount>[] = [
  {
    accessorKey: "id",
    header: "No",
  },
  {
    accessorKey: "reff",
    header: "Reference",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    accessorKey: "flow",
    header: "Flow",
    cell: ({ row }) => {
      const flow = row.getValue("flow") as string;
      return flow.charAt(0).toUpperCase() + flow.slice(1);
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const account = row.original;
      const utils = api.useUtils();

      const deleteAccount = api.chartAccount.delete.useMutation({
        onSuccess: () => {
          toast.success("Chart account deleted successfully");
          utils.chartAccount.getAll.invalidate();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      });

      const handleEdit = () => {
        const event = new CustomEvent("editChartAccount", {
          detail: { id: account.id }
        });
        window.dispatchEvent(event);
      };

      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm("Are you sure you want to delete this account?")) {
                deleteAccount.mutate({ id: account.id });
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
]; 