"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { DataTable } from "@/app/_components/datatable/data-table";
import { getColumns, type MutationLog } from "./columns";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import { Badge } from "@/app/_components/ui/badge";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { Button } from "@/app/_components/ui/button";
import { Download } from "lucide-react";

export default function SystemLogsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [endpoint, setEndpoint] = useState<string | undefined>(undefined);
  const [method, setMethod] = useState<string | undefined>(undefined);
  const [success, setSuccess] = useState<boolean | undefined>(undefined);
  const [model, setModel] = useState<string | undefined>(undefined);
  const [action, setAction] = useState<string | undefined>(undefined);
  const [selectedLog, setSelectedLog] = useState<MutationLog | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { data: logs, isLoading } = api.logs.getMutationLogs.useQuery({
    page,
    limit,
    endpoint,
    method,
    success,
    model,
    action,
  });

  // Extract unique models and actions from logs
  const uniqueModels = Array.from(
    new Set(
      logs?.items
        .map((log) => {
          const parts = log.endpoint.split(".");
          return parts.length > 1 ? parts[0] : null;
        })
        .filter(Boolean) as string[]
    )
  ).sort();

  const uniqueActions = Array.from(
    new Set(
      logs?.items
        .map((log) => {
          const parts = log.endpoint.split(".");
          return parts.length > 1 ? parts[1] : null;
        })
        .filter(Boolean) as string[]
    )
  ).sort();

  const handleViewDetails = (log: MutationLog) => {
    setSelectedLog(log);
    setIsDetailsOpen(true);
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const handleExportCSV = () => {
    if (!logs?.items || logs.items.length === 0) return;

    const headers = [
      "Timestamp",
      "Endpoint",
      "Method",
      "User",
      "Status",
      "Duration (ms)",
      "IP Address",
      "Error Message",
    ];

    const rows = logs.items.map((log) => [
      format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss"),
      log.endpoint,
      log.method,
      log.user?.name || "N/A",
      log.success ? "Success" : "Failed",
      log.duration?.toString() || "N/A",
      log.ipAddress || "N/A",
      log.errorMessage || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `mutation-logs-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = getColumns({ onViewDetails: handleViewDetails });

  return (
    <ProtectedRoute requiredPermissions={["list:logs"]}>
      <div className="container mx-auto py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">API Mutation Logs</h1>
            <p className="text-muted-foreground mt-1">
              View and monitor all API mutation operations
            </p>
          </div>
          <Button
            onClick={handleExportCSV}
            variant="outline"
            disabled={!logs?.items || logs.items.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="w-full sm:w-auto sm:flex-1 sm:max-w-xs">
            <Select
              value={model || "all"}
              onValueChange={(value) =>
                setModel(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                {uniqueModels.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-auto sm:flex-1 sm:max-w-xs">
            <Select
              value={action || "all"}
              onValueChange={(value) =>
                setAction(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-auto sm:flex-1 sm:max-w-xs">
            <Select
              value={method || "all"}
              onValueChange={(value) =>
                setMethod(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-auto sm:flex-1 sm:max-w-xs">
            <Select
              value={
                success === undefined ? "all" : success ? "success" : "failed"
              }
              onValueChange={(value) =>
                setSuccess(
                  value === "all"
                    ? undefined
                    : value === "success"
                    ? true
                    : false
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success Only</SelectItem>
                <SelectItem value="failed">Failed Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          data={{
            items: logs?.items || [],
            total: logs?.total || 0,
            page: logs?.page || 1,
            limit: logs?.limit || 10,
          }}
          columns={columns}
          isLoading={isLoading}
          onPaginationChange={handlePaginationChange}
        />

        {/* Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Mutation Log Details</DialogTitle>
              <DialogDescription>
                Detailed information about this API mutation
              </DialogDescription>
            </DialogHeader>

            {selectedLog && (
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Timestamp
                    </label>
                    <p className="text-sm">
                      {format(
                        new Date(selectedLog.createdAt),
                        "MMM dd, yyyy HH:mm:ss"
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Endpoint
                    </label>
                    <p className="text-sm">
                      <code className="rounded bg-muted px-1.5 py-0.5">
                        {selectedLog.endpoint}
                      </code>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Method
                    </label>
                    <p className="text-sm">
                      <Badge variant="outline">{selectedLog.method}</Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Status
                    </label>
                    <p className="text-sm">
                      <Badge
                        variant={
                          selectedLog.success ? "default" : "destructive"
                        }
                        className={
                          selectedLog.success
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-red-500 hover:bg-red-600"
                        }
                      >
                        {selectedLog.success ? "Success" : "Failed"}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Duration
                    </label>
                    <p className="text-sm">
                      {selectedLog.duration ? `${selectedLog.duration}ms` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      IP Address
                    </label>
                    <p className="text-sm font-mono">
                      {selectedLog.ipAddress || "N/A"}
                    </p>
                  </div>
                </div>

                {/* User Info */}
                {selectedLog.user && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      User
                    </label>
                    <div className="mt-1 rounded-md border p-3">
                      <p className="text-sm font-medium">
                        {selectedLog.user.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedLog.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        ID: {selectedLog.user.id}
                      </p>
                    </div>
                  </div>
                )}

                {/* User Agent */}
                {selectedLog.userAgent && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      User Agent
                    </label>
                    <p className="text-xs font-mono mt-1 rounded-md border p-2 break-all">
                      {selectedLog.userAgent}
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {selectedLog.errorMessage && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground text-red-600">
                      Error Message
                    </label>
                    <pre className="text-xs mt-1 rounded-md border border-red-200 bg-red-50 dark:bg-red-950 p-3 overflow-x-auto">
                      {selectedLog.errorMessage}
                    </pre>
                  </div>
                )}

                {/* Request Data */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Request Data
                  </label>
                  <pre className="text-xs mt-1 rounded-md border bg-muted p-3 overflow-x-auto">
                    {JSON.stringify(selectedLog.requestData, null, 2)}
                  </pre>
                </div>

                {/* Response Data */}
                {selectedLog.responseData && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Response Data
                    </label>
                    <pre className="text-xs mt-1 rounded-md border bg-muted p-3 overflow-x-auto">
                      {JSON.stringify(selectedLog.responseData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
