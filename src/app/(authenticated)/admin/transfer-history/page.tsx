"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/datatable/data-table";
import { Download, FileText, X } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

export default function TransferHistoryPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [memberSearch, setMemberSearch] = useState<string>("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { toast } = useToast();

  // Cancel transfer mutation
  const cancelTransferMutation = api.subs.cancelTransfer.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Transfer cancelled successfully. Subscription returned to original member.",
      });
      void refetch();
      setCancelDialogOpen(false);
      setSelectedTransfer(null);
      setCancelReason("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel transfer",
        variant: "destructive",
      });
    },
  });

  // Query for transfer history
  const { data: transferHistory, isLoading, refetch } = api.subs.listAllTransferHistory.useQuery(
    {
      page,
      limit,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      memberSearch: memberSearch || undefined,
    },
    {
      enabled: !!session,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
    },
  );

  // Query for export - fetch all data without pagination
  const [shouldExport, setShouldExport] = useState(false);
  const { data: exportData, isLoading: isExporting } = api.subs.listAllTransferHistory.useQuery(
    {
      page: 1,
      limit: 10000, // Large limit to get all records
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      memberSearch: memberSearch || undefined,
    },
    {
      enabled: shouldExport,
    }
  );

  // Effect to handle export when data is fetched
  useEffect(() => {
    if (shouldExport && exportData && !isExporting) {
      performExport(exportData.items);
      setShouldExport(false);
    }
  }, [shouldExport, exportData, isExporting]);

  // Transfer History columns
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="ID" />
      ),
      cell: ({ row }) => {
        const id = row.original.id;
        const truncatedId = id ? id.slice(0, 8) : "N/A";
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="min-w-[70px] cursor-help">
                  <span className="text-xs font-mono">{truncatedId}...</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-mono text-xs">{id}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: "subscriptionId",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Subscription ID" />
      ),
      cell: ({ row }) => {
        const subId = row.original.subscriptionId;
        const truncatedSubId = subId ? subId.slice(0, 8) : "N/A";
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`/admin/subscription-history`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-[100px] cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <span className="text-xs font-mono">{truncatedSubId}...</span>
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-mono text-xs">{subId}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: "subscription.package.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Package Name" />
      ),
      cell: ({ row }) => {
        const packageName = row.original.subscription?.package?.name;
        return (
          <div className="min-w-[120px]">
            <span className="text-sm">{packageName || "N/A"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "transferredPoint",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Transferred Points" />
      ),
      cell: ({ row }) => {
        const points = row.original.transferredPoint;
        return (
          <div className="text-center min-w-[80px]">
            <span className="font-medium">{points ?? "N/A"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "fromMember",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="From Member" />
      ),
      cell: ({ row }) => {
        const fromMemberName = row.original.fromMemberName;
        const fromMemberEmail = row.original.fromMemberEmail;
        return (
          <div className="flex flex-col min-w-[150px]">
            <span className="font-medium text-sm truncate">{fromMemberName || "N/A"}</span>
            <span className="text-xs text-muted-foreground truncate">{fromMemberEmail || ""}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "toMember",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="To Member" />
      ),
      cell: ({ row }) => {
        const toMemberName = row.original.subscription?.member?.user?.name;
        const toMemberEmail = row.original.subscription?.member?.user?.email;
        return (
          <div className="flex flex-col min-w-[150px]">
            <span className="font-medium text-sm truncate">{toMemberName || "N/A"}</span>
            <span className="text-xs text-muted-foreground truncate">{toMemberEmail || ""}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount" />
      ),
      cell: ({ row }) => {
        const amount = row.original.amount;
        return (
          <div className="min-w-[100px]">
            <span className="text-sm font-medium">
              {amount != null ? `Rp ${amount.toLocaleString('id-ID')}` : "N/A"}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "file",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="File" />
      ),
      cell: ({ row }) => {
        const file = row.original.file;
        return (
          <div className="min-w-[70px]">
            {file ? (
              <a
                href={file}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <FileText className="h-4 w-4" />
                <span className="text-xs">View</span>
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "reason",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Reason" />
      ),
      cell: ({ row }) => {
        const reason = row.original.reason;
        const truncatedReason = reason && reason.length > 30 ? reason.slice(0, 30) + "..." : reason;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="min-w-[150px] cursor-help">
                  <span className="text-xs">{truncatedReason || "N/A"}</span>
                </div>
              </TooltipTrigger>
              {reason && reason.length > 30 && (
                <TooltipContent>
                  <p className="text-xs max-w-xs">{reason}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Transfer Date" />
      ),
      cell: ({ row }) => {
        const createdAt = row.original.createdAt;
        return (
          <div className="min-w-[110px]">
            <span className="text-xs">
              {createdAt ? format(new Date(createdAt), "dd/MM/yyyy HH:mm") : "N/A"}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const isCancelled = row.original.isCancelled;
        const transferId = row.original.id;
        
        if (isCancelled) {
          return (
            <div className="min-w-[100px]">
              <span className="text-xs text-red-600 font-medium">Cancelled</span>
              {row.original.cancelledAt && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(row.original.cancelledAt), "dd/MM/yyyy")}
                </p>
              )}
            </div>
          );
        }

        return (
          <div className="min-w-[100px]">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setSelectedTransfer(row.original);
                setCancelDialogOpen(true);
              }}
              className="flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Cancel
            </Button>
          </div>
        );
      },
    },
  ];

  const handleCancelTransfer = () => {
    if (!selectedTransfer) return;
    
    cancelTransferMutation.mutate({
      transferHistoryId: selectedTransfer.id,
      reason: cancelReason || undefined,
    });
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    setPage(1);
  };

  const handleEndDateChange = (date: string) => {
    setEndDate(date);
    setPage(1);
  };

  const handleMemberSearchChange = (search: string) => {
    setMemberSearch(search);
    setPage(1);
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setMemberSearch("");
    setPage(1);
  };

  // Export function - trigger data fetch
  const handleExportCSV = () => {
    if (!transferHistory || transferHistory.items.length === 0) {
      toast({
        title: "No Data",
        description: "There is no data to export",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Exporting...",
      description: "Fetching all data, please wait...",
    });
    setShouldExport(true);
  };

  // Perform the actual export
  const performExport = (allData: any[]) => {
    try {
      if (!allData || allData.length === 0) {
        toast({
          title: "No Data",
          description: "There is no data to export",
          variant: "destructive",
        });
        return;
      }

      // Prepare CSV headers
      const headers = [
        "ID",
        "Subscription ID",
        "Package Name",
        "Transferred Points",
        "From Member Name",
        "From Member Email",
        "To Member Name",
        "To Member Email",
        "Amount",
        "File",
        "Reason",
        "Transfer Date"
      ];

      // Prepare CSV rows
      const rows = allData.map(item => [
        item.id || "N/A",
        item.subscriptionId || "N/A",
        item.subscription?.package?.name || "N/A",
        item.transferredPoint ?? "N/A",
        item.fromMemberName || "N/A",
        item.fromMemberEmail || "N/A",
        item.subscription?.member?.user?.name || "N/A",
        item.subscription?.member?.user?.email || "N/A",
        item.amount != null ? `Rp ${item.amount.toLocaleString('id-ID')}` : "N/A",
        item.file || "N/A",
        item.reason || "N/A",
        item.createdAt ? format(new Date(item.createdAt), "dd/MM/yyyy HH:mm") : "N/A"
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `transfer-history-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: `Exported ${allData.length} records to CSV`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  return (
    <ProtectedRoute>
      <div className="w-full min-h-screen bg-background p-2 sm:p-4 lg:p-8">
        <div className="max-w-full mx-auto">
          <div className="mb-4 sm:mb-8 flex flex-col items-start justify-between gap-2 sm:gap-4 md:flex-row md:items-center">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Transfer History</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                View complete history of all subscription transfers
              </p>
            </div>
            <Button
              onClick={handleExportCSV}
              disabled={isLoading || !transferHistory || transferHistory.items.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <Card className="w-full">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">All Transfer Records</CardTitle>
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                <div>
                  <Label htmlFor="startDateFilter" className="text-sm font-medium mb-2 block">
                    Start Date From
                  </Label>
                  <Input
                    id="startDateFilter"
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="endDateFilter" className="text-sm font-medium mb-2 block">
                    End Date Until
                  </Label>
                  <Input
                    id="endDateFilter"
                    type="date"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="memberSearchFilter" className="text-sm font-medium mb-2 block">
                    Search Member
                  </Label>
                  <Input
                    id="memberSearchFilter"
                    type="text"
                    placeholder="Search by name or email..."
                    value={memberSearch}
                    onChange={(e) => handleMemberSearchChange(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <div className="w-full">
                <DataTable
                  columns={columns}
                  data={transferHistory ?? { items: [], total: 0, page: 1, limit: 10 }}
                  isLoading={isLoading}
                  onPaginationChange={handlePaginationChange}
                  onSearch={() => {}}
                  searchColumns={[]}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cancel Transfer Confirmation Dialog */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Transfer</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>
                  Are you sure you want to cancel this subscription transfer?
                  This action will:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Return the subscription to the original member</li>
                  <li>Reverse the point transfer</li>
                  <li>Mark this transfer record as cancelled</li>
                </ul>
                {selectedTransfer && (
                  <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                    <p>
                      <strong>From:</strong> {selectedTransfer.fromMemberName}
                    </p>
                    <p>
                      <strong>To:</strong>{" "}
                      {selectedTransfer.subscription?.member?.user?.name || "N/A"}
                    </p>
                    <p>
                      <strong>Package:</strong>{" "}
                      {selectedTransfer.subscription?.package?.name || "N/A"}
                    </p>
                    <p>
                      <strong>Points:</strong> {selectedTransfer.transferredPoint}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="cancelReason">
                    Reason for Cancellation (Optional)
                  </Label>
                  <Textarea
                    id="cancelReason"
                    placeholder="Enter reason for cancelling this transfer..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setCancelDialogOpen(false);
                  setSelectedTransfer(null);
                  setCancelReason("");
                }}
              >
                No, Keep Transfer
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelTransfer}
                disabled={cancelTransferMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {cancelTransferMutation.isPending ? "Cancelling..." : "Yes, Cancel Transfer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
}
