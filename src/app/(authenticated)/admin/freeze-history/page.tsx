"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/datatable/data-table";
import { Download, XCircle, Play } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function FreezeHistoryPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [operationType, setOperationType] = useState<"all" | "FREEZE" | "UNFREEZE" | "CANCEL_FREEZE">("all");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedFreeze, setSelectedFreeze] = useState<any>(null);
  const [unfreezeDialogOpen, setUnfreezeDialogOpen] = useState(false);
  const [selectedSubscriptionToUnfreeze, setSelectedSubscriptionToUnfreeze] = useState<any>(null);
  const [unfreezeConfirmationText, setUnfreezeConfirmationText] = useState("");

  const { toast } = useToast();

  // Query for freeze history
  const { data: freezeHistory, isLoading, refetch } = api.subs.listFreezeHistory.useQuery(
    {
      page,
      limit,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      operationType: operationType as "all" | "FREEZE" | "UNFREEZE" | "CANCEL_FREEZE",
    },
    {
      enabled: !!session,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
    },
  );

  // Cancel freeze mutation
  const cancelFreezeMutation = api.subs.cancelFreeze.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Freeze Cancelled",
        description: data.message,
      });
      setCancelDialogOpen(false);
      setSelectedFreeze(null);
      void refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel freeze",
        variant: "destructive",
      });
    },
  });

  // Unfreeze mutation
  const unfreezeMutation = api.subs.unfreeze.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Subscription Unfrozen",
        description: data.message || "Subscription has been successfully unfrozen",
      });
      setUnfreezeDialogOpen(false);
      setSelectedSubscriptionToUnfreeze(null);
      setUnfreezeConfirmationText("");
      void refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unfreeze subscription",
        variant: "destructive",
      });
    },
  });

  // Query for export - fetch all data without pagination
  const [shouldExport, setShouldExport] = useState(false);
  const { data: exportData, isLoading: isExporting } = api.subs.listFreezeHistory.useQuery(
    {
      page: 1,
      limit: 10000, // Large limit to get all records
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      operationType,
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

  // Handle cancel freeze dialog
  const handleCancelFreeze = (freeze: any) => {
    setSelectedFreeze(freeze);
    setCancelDialogOpen(true);
  };

  const confirmCancelFreeze = () => {
    if (!selectedFreeze) return;
    
    cancelFreezeMutation.mutate({
      memberId: selectedFreeze.memberId,
      reason: "Freeze cancelled from admin panel",
    });
  };

  // Handle unfreeze dialog
  const handleUnfreeze = (subscription: any) => {
    setSelectedSubscriptionToUnfreeze(subscription);
    setUnfreezeConfirmationText("");
    setUnfreezeDialogOpen(true);
  };

  const confirmUnfreeze = () => {
    if (!selectedSubscriptionToUnfreeze) return;
    
    // Use memberId from the grouped freeze record
    const memberId = selectedSubscriptionToUnfreeze.memberId;
    
    if (!memberId) {
      toast({
        title: "Error",
        description: "Member ID not found",
        variant: "destructive",
      });
      return;
    }
    
    unfreezeMutation.mutate({
      memberId,
    });
  };

  // Check if unfreeze confirmation text is valid (memoized to prevent input lag)
  const isUnfreezeConfirmationValid = useMemo(
    () => unfreezeConfirmationText.toLowerCase().trim() === "unfreeze",
    [unfreezeConfirmationText]
  );

  // Freeze History columns - grouped by member
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "memberName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Member Name" />
      ),
      cell: ({ row }) => {
        const memberName = row.original.memberName;
        return (
          <div className="min-w-[150px]">
            <span className="text-sm font-medium">{memberName || "N/A"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "memberEmail",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Member Email" />
      ),
      cell: ({ row }) => {
        const memberEmail = row.original.memberEmail;
        return (
          <div className="min-w-[180px]">
            <span className="text-xs text-muted-foreground">{memberEmail || "N/A"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "operationType",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Operation" />
      ),
      cell: ({ row }) => {
        const operationType = row.original.operationType;
        return (
          <div className="min-w-[100px] flex justify-center">
            {operationType === "FREEZE" ? (
              <Badge variant="default" className="bg-blue-500">Freeze</Badge>
            ) : operationType === "UNFREEZE" ? (
              <Badge variant="default" className="bg-green-500">Unfreeze</Badge>
            ) : operationType === "CANCEL_FREEZE" ? (
              <Badge variant="outline" className="border-destructive text-destructive">Cancel Freeze</Badge>
            ) : (
              <Badge variant="default" className="bg-gray-500">{operationType}</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "subscriptions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Packages Frozen" />
      ),
      cell: ({ row }) => {
        const subscriptions = row.original.subscriptions || [];
        return (
          <div className="min-w-[150px]">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <span className="text-sm font-medium">{subscriptions.length} package(s)</span>
                    {subscriptions.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {subscriptions[0].packageName}
                        {subscriptions.length > 1 && ` +${subscriptions.length - 1} more`}
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="space-y-1">
                    {subscriptions.map((sub: any, idx: number) => (
                      <div key={idx} className="text-xs">
                        • {sub.packageName} ({sub.packageType})
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
    {
      accessorKey: "freezeDays",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Freeze Days" />
      ),
      cell: ({ row }) => {
        const freezeDays = row.original.freezeDays;
        return (
          <div className="text-center min-w-[80px]">
            <span className="font-medium">{freezeDays ?? "0"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Payment Amount" />
      ),
      cell: ({ row }) => {
        const price = row.original.price || 0;
        return (
          <div className="min-w-[120px] text-right">
            <span className="text-sm font-medium">
              Rp {price.toLocaleString("id-ID")}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "performedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Operation Date" />
      ),
      cell: ({ row }) => {
        const performedAt = row.original.performedAt;
        return (
          <div className="min-w-[130px]">
            <span className="text-xs">
              {performedAt ? format(new Date(performedAt), "dd/MM/yyyy HH:mm") : "N/A"}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "performedBy.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Performed By" />
      ),
      cell: ({ row }) => {
        const performedBy = row.original.performedBy;
        return (
          <div className="min-w-[120px]">
            <span className="text-xs">{performedBy?.name || "N/A"}</span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => {
        const freeze = row.original;
        const isFreezeOperation = freeze.operationType === "FREEZE";
        const hasFreezeData = freeze.freezeDays && freeze.freezeDays > 0;
        
        // Check if any subscription is currently frozen
        const hasFrozenSubscription = freeze.subscriptions?.some((sub: any) => sub.isFrozen);
        
        // Only show action buttons for FREEZE operations with freeze days that are still active
        if (!isFreezeOperation || !hasFreezeData) {
          return <div className="text-center text-xs text-muted-foreground">-</div>;
        }

        // If all subscriptions have been unfrozen/cancelled, show no actions
        if (!hasFrozenSubscription) {
          return <div className="text-center text-xs text-muted-foreground italic">-</div>;
        }

        return (
          <div className="flex justify-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelFreeze(freeze)}
                    disabled={cancelFreezeMutation.isPending}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cancel Freeze</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
        
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnfreeze(freeze)}
                      disabled={unfreezeMutation.isPending}
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Unfreeze Subscription</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            
          </div>
        );
      },
    },
  ];

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

  const handleOperationTypeChange = (value: "all" | "FREEZE" | "UNFREEZE" | "CANCEL_FREEZE") => {
    setOperationType(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setOperationType("all");
    setPage(1);
  };

  // Export function - trigger data fetch
  const handleExportCSV = () => {
    if (!freezeHistory || freezeHistory.items.length === 0) {
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
        "Member Name",
        "Member Email",
        "Operation Type",
        "Number of Packages",
        "Package Details",
        "Freeze Days",
        "Payment Amount",
        "Operation Date",
        "Performed By"
      ];

      // Prepare CSV rows
      const rows = allData.map(item => {
        const subscriptions = item.subscriptions || [];
        const packageDetails = subscriptions
          .map((sub: any) => `${sub.packageName} (${sub.packageType})`)
          .join("; ");

        return [
          item.memberName || "N/A",
          item.memberEmail || "N/A",
          item.operationType || "N/A",
          subscriptions.length,
          packageDetails || "N/A",
          item.freezeDays ?? "0",
          item.price || 0,
          item.performedAt ? format(new Date(item.performedAt), "dd/MM/yyyy HH:mm") : "N/A",
          item.performedBy?.name || "N/A"
        ];
      });

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
      link.setAttribute("download", `freeze-history-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`);
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
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Freeze History</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                View all member freeze operations (grouped by member)
              </p>
            </div>
            <Button
              onClick={handleExportCSV}
              disabled={isLoading || !freezeHistory || freezeHistory.items.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <Card className="w-full">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Freeze Operations</CardTitle>
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                <div>
                  <Label htmlFor="startDateFilter" className="text-sm font-medium mb-2 block">
                    Operation Date From
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
                    Operation Date Until
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
                  <Label htmlFor="operationTypeFilter" className="text-sm font-medium mb-2 block">
                    Operation Type
                  </Label>
                  <Select value={operationType} onValueChange={handleOperationTypeChange}>
                    <SelectTrigger id="operationTypeFilter" className="w-full">
                      <SelectValue placeholder="Select operation type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="FREEZE">Freeze</SelectItem>
                      <SelectItem value="UNFREEZE">Unfreeze</SelectItem>
                      <SelectItem value="CANCEL_FREEZE">Cancel Freeze</SelectItem>
                    </SelectContent>
                  </Select>
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
                  data={freezeHistory ?? { items: [], total: 0, page: 1, limit: 10 }}
                  isLoading={isLoading}
                  onPaginationChange={handlePaginationChange}
                  onSearch={() => {}}
                  searchColumns={[]}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cancel Freeze Confirmation Dialog */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Freeze Operation</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    Are you sure you want to cancel the freeze for{" "}
                    <span className="font-semibold">{selectedFreeze?.memberName}</span>?
                  </p>
                  
                  {selectedFreeze && (
                    <div className="rounded-lg border bg-muted/50 p-3 space-y-2 text-sm">
                      <div className="font-medium">What will happen:</div>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>All freeze fields will be reset to default values</li>
                        <li>Freeze days ({selectedFreeze.freezeDays || 0} days) will be removed from subscription end dates</li>
                        <li>Original end dates will be restored (before freeze extension)</li>
                        <li>
                          Affected packages: {selectedFreeze.subscriptions?.length || 0} subscription(s)
                        </li>
                      </ul>
                      
                      {selectedFreeze.subscriptions && selectedFreeze.subscriptions.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="font-medium mb-1">Packages:</div>
                          <div className="space-y-1">
                            {selectedFreeze.subscriptions.map((sub: any, idx: number) => (
                              <div key={idx} className="text-xs text-muted-foreground">
                                • {sub.packageName} ({sub.packageType})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-sm text-destructive font-medium">
                    This action will reverse the freeze operation and cannot be undone.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancelFreezeMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmCancelFreeze}
                disabled={cancelFreezeMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {cancelFreezeMutation.isPending ? "Cancelling..." : "Confirm Cancel Freeze"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Unfreeze Confirmation Dialog */}
        <Dialog
          open={unfreezeDialogOpen}
          onOpenChange={(open) => {
            setUnfreezeDialogOpen(open);
            if (!open) {
              setUnfreezeConfirmationText("");
              setSelectedSubscriptionToUnfreeze(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unfreeze Subscription</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    Are you sure you want to unfreeze the subscription for{" "}
                    <span className="font-semibold">{selectedSubscriptionToUnfreeze?.memberName}</span>?
                  </p>
                  
                  {selectedSubscriptionToUnfreeze && (
                    <div className="rounded-lg border bg-muted/50 p-3 space-y-2 text-sm">
                      <div className="font-medium">What will happen:</div>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>The subscription will resume immediately</li>
                        <li>Freeze status will be removed</li>
                        <li>Member will regain full access to the gym</li>
                        <li>
                          Affected packages: {selectedSubscriptionToUnfreeze.subscriptions?.length || 0} subscription(s)
                        </li>
                      </ul>
                      
                      {selectedSubscriptionToUnfreeze.subscriptions && selectedSubscriptionToUnfreeze.subscriptions.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="font-medium mb-1">Packages:</div>
                          <div className="space-y-1">
                            {selectedSubscriptionToUnfreeze.subscriptions.map((sub: any, idx: number) => (
                              <div key={idx} className="text-xs text-muted-foreground">
                                • {sub.packageName} ({sub.packageType})
                                {sub.isFrozen && <span className="ml-1 text-blue-600">(Currently Frozen)</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">
                      To confirm, please type <span className="font-mono font-bold">unfreeze</span> below:
                    </p>
                    <Input
                      placeholder="Type 'unfreeze' to confirm"
                      value={unfreezeConfirmationText}
                      onChange={(e) => setUnfreezeConfirmationText(e.target.value)}
                      className={
                        unfreezeConfirmationText && isUnfreezeConfirmationValid
                          ? "border-green-500 focus-visible:ring-green-500"
                          : ""
                      }
                      autoComplete="off"
                      disabled={unfreezeMutation.isPending}
                    />
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setUnfreezeDialogOpen(false);
                  setUnfreezeConfirmationText("");
                  setSelectedSubscriptionToUnfreeze(null);
                }}
                disabled={unfreezeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmUnfreeze}
                disabled={!isUnfreezeConfirmationValid || unfreezeMutation.isPending}
                variant="destructive"
              >
                {unfreezeMutation.isPending ? "Unfreezing..." : "Confirm Unfreeze"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
