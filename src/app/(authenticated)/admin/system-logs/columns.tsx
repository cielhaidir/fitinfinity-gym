"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Eye } from "lucide-react";
import { format } from "date-fns";

export type MutationLog = {
  id: string;
  endpoint: string;
  method: string;
  userId: string | null;
  requestData: any;
  responseData: any;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  errorMessage: string | null;
  duration: number | null;
  createdAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type ColumnsProps = {
  onViewDetails: (log: MutationLog) => void;
};

export const getColumns = ({
  onViewDetails,
}: ColumnsProps): ColumnDef<MutationLog>[] => [
  {
    accessorKey: "createdAt",
    header: "Timestamp",
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return (
        <div className="text-sm">
          <div>{format(date, "MMM dd, yyyy")}</div>
          <div className="text-muted-foreground">{format(date, "HH:mm:ss")}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "endpoint",
    header: "Endpoint",
    cell: ({ row }) => (
      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
        {row.getValue("endpoint")}
      </code>
    ),
  },
  {
    accessorKey: "method",
    header: "Method",
    cell: ({ row }) => {
      const method = row.getValue("method") as string;
      const colors: Record<string, string> = {
        POST: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        PUT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        PATCH: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      };
      return (
        <Badge variant="outline" className={colors[method] || ""}>
          {method}
        </Badge>
      );
    },
  },
  {
    accessorKey: "user.name",
    header: "User",
    cell: ({ row }) => {
      const user = row.original.user;
      if (!user) {
        return <span className="text-muted-foreground text-sm">N/A</span>;
      }
      return (
        <div className="text-sm">
          <div>{user.name}</div>
          <div className="text-muted-foreground text-xs">{user.email}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "success",
    header: "Status",
    cell: ({ row }) => {
      const success = row.getValue("success") as boolean;
      return (
        <Badge
          variant={success ? "default" : "destructive"}
          className={
            success
              ? "bg-green-500 hover:bg-green-600"
              : "bg-red-500 hover:bg-red-600"
          }
        >
          {success ? "Success" : "Failed"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => {
      const duration = row.getValue("duration") as number | null;
      if (duration === null) {
        return <span className="text-muted-foreground text-sm">-</span>;
      }
      return <span className="text-sm">{duration}ms</span>;
    },
  },
  {
    accessorKey: "ipAddress",
    header: "IP Address",
    cell: ({ row }) => {
      const ip = row.getValue("ipAddress") as string | null;
      return (
        <span className="text-sm font-mono">
          {ip || <span className="text-muted-foreground">N/A</span>}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewDetails(row.original)}
      >
        <Eye className="mr-2 h-4 w-4" />
        Details
      </Button>
    ),
  },
];
