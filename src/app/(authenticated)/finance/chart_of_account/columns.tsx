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
    header: "Account Type",
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
      const chartAccount = row.original;
      const utils = api.useUtils();
      const deleteMutation = api.chartAccount.delete.useMutation({
        onSuccess: () => {
          toast.success("Chart account deleted successfully");
          utils.chartAccount.getAll.invalidate();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      });

      const handleDelete = () => {
        if (confirm("Are you sure you want to delete this account?")) {
          deleteMutation.mutate({ id: chartAccount.id });
        }
      };

      return (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const event = new CustomEvent("editChartAccount", {
                detail: chartAccount.id,
              });
              window.dispatchEvent(event);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
]; 