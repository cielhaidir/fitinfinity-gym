"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/datatable/data-table";
import { Package, Users, Calendar, Clock, CreditCard, Edit, ArrowRightLeft, MoreHorizontal, TrendingUp, UserCheck } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function AdminSubscriptionHistoryPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState("member.user.name");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [selectedSalesId, setSelectedSalesId] = useState<string>("");
  const [selectedSalesType, setSelectedSalesType] = useState<string>("");
  
  // Transfer functionality state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedSubscriptionForTransfer, setSelectedSubscriptionForTransfer] = useState<any>(null);
  const [transferNewUserId, setTransferNewUserId] = useState("");
  const [transferNewUserName, setTransferNewUserName] = useState("");
  const [transferUserSearch, setTransferUserSearch] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  // Edit dates functionality state
  const [editDatesDialogOpen, setEditDatesDialogOpen] = useState(false);
  const [selectedSubscriptionForEdit, setSelectedSubscriptionForEdit] = useState<any>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  
  // Upgrade functionality state
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedSubscriptionForUpgrade, setSelectedSubscriptionForUpgrade] = useState<any>(null);
  const [upgradeNewPackageId, setUpgradeNewPackageId] = useState("");
  const [upgradeNewEndDate, setUpgradeNewEndDate] = useState("");
  const [upgradePaymentProofPath, setUpgradePaymentProofPath] = useState("");
  
  // Edit Personal Trainer functionality state
  const [editTrainerDialogOpen, setEditTrainerDialogOpen] = useState(false);
  const [selectedSubscriptionForTrainer, setSelectedSubscriptionForTrainer] = useState<any>(null);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>("");
  
  const { toast } = useToast();

  // Query for getting all subscriptions with required fields
  const { data: subscriptions, isLoading, refetch } = api.subs.listActive.useQuery(
    { 
      page, 
      limit, 
      search: search || undefined, 
      searchColumn: searchColumn || undefined,
    },
    {
      enabled: !!session,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
    },
  );

  // Query for getting sales list to get sales names
  const { data: salesList } = api.subs.getSalesList.useQuery(undefined, {
    enabled: !!session,
  });

  // Search users for transfer functionality (only when search has 3+ characters)
  const { data: searchedUsers = [], isLoading: isSearchingUsers } = api.user.search.useQuery(
    {
      query: transferUserSearch,
      excludeUserIds: [], // We can add exclusions if needed
    },
    {
      enabled: transferUserSearch.length >= 3,
    }
  );

  // Query for getting gym packages for upgrade functionality
  const { data: gymPackages = [] } = api.subs.getGymPackages.useQuery(undefined, {
    enabled: !!session,
  });

  // Query for getting personal trainers for edit trainer functionality
  const { data: personalTrainers = [] } = api.personalTrainer.getActiveTrainers.useQuery();
  // Debounce user search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (transferUserSearch.length >= 3) {
        setShowUserDropdown(true);
      } else {
        setShowUserDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [transferUserSearch]);

  // Mutation for updating sales information
  const updateSalesMutation = api.subs.updateSales.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sales information updated successfully",
      });
      setEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sales information",
        variant: "destructive",
      });
    },
  });

  // Mutation for transferring subscription
  const transferSubscriptionMutation = api.subs.transfer.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Subscription transferred successfully",
      });
      setTransferDialogOpen(false);
      setSelectedSubscriptionForTransfer(null);
      setTransferNewUserId("");
      setTransferNewUserName("");
      setTransferUserSearch("");
      setTransferReason("");
      setShowUserDropdown(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to transfer subscription",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating subscription dates
  const updateSubscriptionDates = api.subs.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Subscription dates updated successfully",
      });
      setEditDatesDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription dates",
        variant: "destructive",
      });
    },
  });

  // Mutation for upgrading subscription
  const upgradeSubscriptionMutation = api.subs.upgradeGymSimple.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Subscription upgraded successfully",
      });
      setUpgradeDialogOpen(false);
      setSelectedSubscriptionForUpgrade(null);
      setUpgradeNewPackageId("");
      setUpgradeNewEndDate("");
      setUpgradePaymentProofPath("");
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upgrade subscription",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating personal trainer
  const updateTrainerMutation = api.subs.updateTrainer.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Personal trainer updated successfully",
      });
      setEditTrainerDialogOpen(false);
      setSelectedSubscriptionForTrainer(null);
      setSelectedTrainerId("");
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update personal trainer",
        variant: "destructive",
      });
    },
  });

  // Helper function to get sales person name
  const getSalesPersonName = (salesId: string | null, salesType: string | null) => {
    if (!salesId || !salesType || !salesList) {
      return "Not assigned";
    }
    
    const salesperson = salesList.find(s => s.id === salesId);
    return salesperson ? salesperson.name : "Unknown";
  };

  const handleEditSales = (subscription: any) => {
    setSelectedSubscription(subscription);
    setSelectedSalesId(subscription.salesId || "none");
    setSelectedSalesType(subscription.salesType || "none");
    setEditDialogOpen(true);
  };

  const handleSaveSales = () => {
    if (!selectedSubscription) return;

    updateSalesMutation.mutate({
      subscriptionId: selectedSubscription.id,
      salesId: selectedSalesId === "none" ? null : selectedSalesId,
      salesType: selectedSalesType === "none" ? null : selectedSalesType as "PersonalTrainer" | "FC",
    });
  };

  // Transfer functionality handlers
  const handleTransferSubscription = (subscription: any) => {
    setSelectedSubscriptionForTransfer(subscription);
    setTransferDialogOpen(true);
  };

  const handleConfirmTransfer = () => {
    if (!selectedSubscriptionForTransfer || !transferNewUserId) return;

    transferSubscriptionMutation.mutate({
      subscriptionId: selectedSubscriptionForTransfer.id,
      newUserId: transferNewUserId,
      reason: transferReason.trim() || undefined,
    });
  };

  const handleCancelTransfer = () => {
    setTransferDialogOpen(false);
    setSelectedSubscriptionForTransfer(null);
    setTransferNewUserId("");
    setTransferNewUserName("");
    setTransferUserSearch("");
    setTransferReason("");
    setShowUserDropdown(false);
  };

  const handleUserSelect = (user: { id: string; name: string; email: string }) => {
    setTransferNewUserId(user.id);
    setTransferNewUserName(`${user.name} (${user.email})`);
    setTransferUserSearch(`${user.name} (${user.email})`);
    setShowUserDropdown(false);
  };

  // Edit dates functionality
  const handleEditDates = (subscription: any) => {
    setSelectedSubscriptionForEdit(subscription);
    const startDateStr = subscription.startDate
      ? new Date(subscription.startDate).toISOString().split('T')[0] || ""
      : "";
    const endDateStr = subscription.endDate
      ? new Date(subscription.endDate).toISOString().split('T')[0] || ""
      : "";
    setEditStartDate(startDateStr);
    setEditEndDate(endDateStr);
    setEditDatesDialogOpen(true);
  };

  const handleUpdateDates = async () => {
    if (!selectedSubscriptionForEdit || !editStartDate || !editEndDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(editStartDate);
    const endDate = new Date(editEndDate);

    if (startDate >= endDate) {
      toast({
        title: "Error",
        description: "Start date must be before end date",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateSubscriptionDates.mutateAsync({
        id: selectedSubscriptionForEdit.id,
        startDate: startDate,
        endDate: endDate,
      });
    } catch (error) {
      console.error("Failed to update subscription dates:", error);
    }
  };

  const handleCancelEditDates = () => {
    setEditDatesDialogOpen(false);
    setSelectedSubscriptionForEdit(null);
    setEditStartDate("");
    setEditEndDate("");
  };

  // Upgrade functionality handlers
  const handleUpgradeSubscription = (subscription: any) => {
    setSelectedSubscriptionForUpgrade(subscription);
    setUpgradeNewPackageId("");
    const currentEndDate = subscription.endDate
      ? new Date(subscription.endDate).toISOString().split('T')[0] || ""
      : "";
    setUpgradeNewEndDate(currentEndDate);
    setUpgradePaymentProofPath("");
    setUpgradeDialogOpen(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedSubscriptionForUpgrade || !upgradeNewPackageId || !upgradeNewEndDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const newEndDate = new Date(upgradeNewEndDate);
    const currentEndDate = new Date(selectedSubscriptionForUpgrade.endDate);

    if (newEndDate <= currentEndDate) {
      toast({
        title: "Error",
        description: "New end date must be after current end date",
        variant: "destructive",
      });
      return;
    }

    try {
      await upgradeSubscriptionMutation.mutateAsync({
        subscriptionId: selectedSubscriptionForUpgrade.id,
        newPackageId: upgradeNewPackageId,
        newEndDate: newEndDate,
        paymentProofPath: upgradePaymentProofPath.trim() || undefined,
      });
    } catch (error) {
      console.error("Failed to upgrade subscription:", error);
    }
  };

  const handleCancelUpgrade = () => {
    setUpgradeDialogOpen(false);
    setSelectedSubscriptionForUpgrade(null);
    setUpgradeNewPackageId("");
    setUpgradeNewEndDate("");
    setUpgradePaymentProofPath("");
  };

  // Edit Personal Trainer functionality handlers
  const handleEditTrainer = (subscription: any) => {
    setSelectedSubscriptionForTrainer(subscription);
    setSelectedTrainerId(subscription.trainerId || "none");
    setEditTrainerDialogOpen(true);
  };

  const handleConfirmTrainerUpdate = async () => {
    if (!selectedSubscriptionForTrainer) return;

    try {
      await updateTrainerMutation.mutateAsync({
        subscriptionId: selectedSubscriptionForTrainer.id,
        trainerId: selectedTrainerId === "none" ? null : selectedTrainerId,
      });
    } catch (error) {
      console.error("Failed to update personal trainer:", error);
    }
  };

  const handleCancelTrainerEdit = () => {
    setEditTrainerDialogOpen(false);
    setSelectedSubscriptionForTrainer(null);
    setSelectedTrainerId("none");
  };
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "member.user.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Member" />
      ),
      cell: ({ row }) => {
        const memberName = row.original.member?.user?.name as string | undefined;
        const memberEmail = row.original.member?.user?.email as string | undefined;
        return (
          <div className="flex flex-col min-w-[150px]">
            <span className="font-medium text-sm truncate">{memberName || "N/A"}</span>
            <span className="text-xs text-muted-foreground truncate">{memberEmail}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "package.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Package" />
      ),
      cell: ({ row }) => {
        const packageName = row.original.package?.name;
        const packagePoint = row.original.package?.point;
        return (
          <div className="flex flex-col min-w-[120px]">
            <span className="font-medium text-sm truncate">{packageName || "N/A"}</span>
            <span className="text-xs text-muted-foreground">{packagePoint ? `${packagePoint} pts` : "N/A"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "startDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Period" />
      ),
      cell: ({ row }) => {
        const startDate = row.getValue("startDate") as Date;
        const endDate = row.original.endDate as Date;
        return (
          <div className="flex flex-col min-w-[100px]">
            <span className="text-sm">{startDate ? format(new Date(startDate), "dd/MM/yy") : "N/A"}</span>
            <span className="text-xs text-muted-foreground">{endDate ? format(new Date(endDate), "dd/MM/yy") : "N/A"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "remainingSessions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sessions" />
      ),
      cell: ({ row }) => {
        const remaining = row.original.remainingSessions;
        return (
          <div className="text-center min-w-[70px]">
            <span className="font-medium">{remaining ?? "N/A"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "salesPerson",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sales" />
      ),
      cell: ({ row }) => {
        const salesName = getSalesPersonName(
          row.original.salesId,
          row.original.salesType
        );
        return (
          <div className="min-w-[100px]">
            <span className="text-sm truncate block">{salesName}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const isActive = row.original.isActive;
        return (
          <div className="min-w-[70px]">
            <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const isActive = row.original.isActive;
        return (
          <div className="min-w-[60px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditSales(row.original)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Sales
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEditDates(row.original)}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Edit Dates
                </DropdownMenuItem>
                {isActive && (
                  <DropdownMenuItem onClick={() => handleTransferSubscription(row.original)}>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Transfer
                  </DropdownMenuItem>
                )}
                {isActive && row.original.package?.type === "GYM_MEMBERSHIP" && (
                  <DropdownMenuItem onClick={() => handleUpgradeSubscription(row.original)}>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Upgrade
                   </DropdownMenuItem>
                 )}
                 {row.original.package?.type === "PERSONAL_TRAINER" && (
                   <DropdownMenuItem onClick={() => handleEditTrainer(row.original)}>
                     <UserCheck className="mr-2 h-4 w-4" />
                     Edit Personal Trainer
                   </DropdownMenuItem>
                 )}
               </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const handleSearch = (value: string, column: string) => {
    setSearch(value);
    setSearchColumn(column);
    setPage(1);
  };

  return (
    <ProtectedRoute requiredPermissions={["menu:transaction"]}>
      <div className="w-full min-h-screen bg-background p-2 sm:p-4 lg:p-8">
        <div className="max-w-full mx-auto">
          <div className="mb-4 sm:mb-8 flex flex-col items-start justify-between gap-2 sm:gap-4 md:flex-row md:items-center">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Subscription History</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                View all subscription history with detailed member and package information
              </p>
            </div>
          </div>

          <Card className="w-full">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">All Subscriptions</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <div className="w-full">
                <DataTable
                  columns={columns}
                  data={subscriptions ?? { items: [], total: 0, page: 1, limit: 10 }}
                  searchColumns={[
                    { id: "member.user.name", placeholder: "Search by member name..." },
                    { id: "package.name", placeholder: "Search by package name..." },
                  ]}
                  isLoading={isLoading}
                  onPaginationChange={handlePaginationChange}
                  onSearch={handleSearch}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Sales Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[425px] mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Edit Sales Information</DialogTitle>
              <DialogDescription className="text-sm">
                Update the sales person assigned to this subscription.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="sales-type">Sales Type</Label>
                <Select
                  value={selectedSalesType}
                  onValueChange={setSelectedSalesType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sales type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned</SelectItem>
                    <SelectItem value="PersonalTrainer">Personal Trainer</SelectItem>
                    <SelectItem value="FC">Fitness Consultant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sales-person">Sales Person</Label>
                <Select
                  value={selectedSalesId}
                  onValueChange={setSelectedSalesId}
                  disabled={!selectedSalesType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sales person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned</SelectItem>
                    {salesList
                      ?.filter(sales => sales.type === selectedSalesType)
                      .map((sales) => (
                        <SelectItem key={sales.id} value={sales.id}>
                          {sales.name} ({sales.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={updateSalesMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSales}
                disabled={updateSalesMutation.isPending}
              >
                {updateSalesMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transfer Subscription Dialog */}
        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[500px] mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Transfer Subscription</DialogTitle>
              <DialogDescription className="text-sm">
                {selectedSubscriptionForTransfer && (
                  <>
                    Transfer subscription for <strong>{selectedSubscriptionForTransfer.member?.user?.name}</strong> to another user.
                    This action cannot be undone and will transfer associated points.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2 relative">
                <Label htmlFor="newUser" className="text-sm font-medium">
                  New User *
                </Label>
                <Input
                  id="newUser"
                  placeholder="Type at least 3 characters to search users..."
                  value={transferUserSearch}
                  onChange={(e) => setTransferUserSearch(e.target.value)}
                  className="w-full"
                />
                {isSearchingUsers && transferUserSearch.length >= 3 && (
                  <div className="absolute top-full left-0 right-0 bg-black border hover:text-infinity border-gray-200 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                    <div className="p-2 text-sm">Searching...</div>
                  </div>
                )}
                {showUserDropdown && searchedUsers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-black border border-gray-200 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                    {searchedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="p-2 hover:bg-infinity cursor-pointer border-b last:border-b-0"
                        onClick={() => handleUserSelect({
                          id: user.id,
                          name: user.name ?? "",
                          email: user.email ?? ""
                        })}
                      >
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm">{user.email}</div>
                      </div>
                    ))}
                  </div>
                )}
                {showUserDropdown && searchedUsers.length === 0 && !isSearchingUsers && transferUserSearch.length >= 3 && (
                  <div className="absolute top-full left-0 right-0 bg-black border border-gray-200 rounded-md shadow-lg z-10">
                    <div className="p-2 text-sm">No users found</div>
                  </div>
                )}
                {transferUserSearch.length > 0 && transferUserSearch.length < 3 && (
                  <div className="text-xs mt-1">
                    Type at least 3 characters to search
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason" className="text-sm font-medium">
                  Reason (Optional)
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Enter reason for subscription transfer..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelTransfer}
                disabled={transferSubscriptionMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={transferSubscriptionMutation.isPending || !transferNewUserId}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {transferSubscriptionMutation.isPending ? "Processing..." : "Confirm Transfer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dates Dialog */}
        <Dialog open={editDatesDialogOpen} onOpenChange={setEditDatesDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[425px] mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Edit Subscription Dates</DialogTitle>
              <DialogDescription className="text-sm">
                {selectedSubscriptionForEdit && (
                  <>
                    Update start and end dates for <strong>{selectedSubscriptionForEdit.member?.user?.name}</strong>'s subscription.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate" className="text-sm font-medium">
                  Start Date *
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate" className="text-sm font-medium">
                  End Date *
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEditDates}
                disabled={updateSubscriptionDates.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpdateDates}
                disabled={updateSubscriptionDates.isPending || !editStartDate || !editEndDate}
                className="bg-green-600 hover:bg-green-700"
              >
                {updateSubscriptionDates.isPending ? "Updating..." : "Update Dates"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Upgrade Subscription Dialog */}
        <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[500px] mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Upgrade Subscription</DialogTitle>
              <DialogDescription className="text-sm">
                {selectedSubscriptionForUpgrade && (
                  <>
                    Upgrade gym membership for <strong>{selectedSubscriptionForUpgrade.member?.user?.name}</strong> to a new package.
                    Current package: <strong>{selectedSubscriptionForUpgrade.package?.name}</strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="newPackage" className="text-sm font-medium">
                  New Package *
                </Label>
                <Select
                  value={upgradeNewPackageId}
                  onValueChange={setUpgradeNewPackageId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select new package" />
                  </SelectTrigger>
                  <SelectContent>
                    {gymPackages
                      ?.filter(pkg => pkg.id !== selectedSubscriptionForUpgrade?.packageId)
                      .map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} - {pkg.point} pts
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newEndDate" className="text-sm font-medium">
                  New End Date *
                </Label>
                <Input
                  id="newEndDate"
                  type="date"
                  value={upgradeNewEndDate}
                  onChange={(e) => setUpgradeNewEndDate(e.target.value)}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">
                  Current end date: {selectedSubscriptionForUpgrade?.endDate
                    ? format(new Date(selectedSubscriptionForUpgrade.endDate), "dd/MM/yyyy")
                    : "N/A"}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paymentProof" className="text-sm font-medium">
                  Payment Proof Path (Optional)
                </Label>
                <Input
                  id="paymentProof"
                  placeholder="Enter payment proof URL or path..."
                  value={upgradePaymentProofPath}
                  onChange={(e) => setUpgradePaymentProofPath(e.target.value)}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">
                  Provide a URL or file path for payment verification (optional for Phase 1)
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelUpgrade}
                disabled={upgradeSubscriptionMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmUpgrade}
                disabled={upgradeSubscriptionMutation.isPending || !upgradeNewPackageId || !upgradeNewEndDate}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {upgradeSubscriptionMutation.isPending ? "Upgrading..." : "Confirm Upgrade"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Personal Trainer Dialog */}
        <Dialog open={editTrainerDialogOpen} onOpenChange={setEditTrainerDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[425px] mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Edit Personal Trainer</DialogTitle>
              <DialogDescription className="text-sm">
                {selectedSubscriptionForTrainer && (
                  <>
                    Update the personal trainer for <strong>{selectedSubscriptionForTrainer.member?.user?.name}</strong>'s subscription.
                    Current package: <strong>{selectedSubscriptionForTrainer.package?.name}</strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="trainer" className="text-sm font-medium">
                  Personal Trainer
                </Label>
                <Select
                  value={selectedTrainerId}
                  onValueChange={setSelectedTrainerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select personal trainer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No trainer assigned</SelectItem>
                    {personalTrainers
                      ?.map((trainer) => (
                        <SelectItem key={trainer.id} value={trainer.id}>
                          {trainer.user?.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSubscriptionForTrainer?.trainer && (
                <div className="text-xs text-muted-foreground">
                  Current trainer: {selectedSubscriptionForTrainer.trainer.user?.name || "N/A"}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelTrainerEdit}
                disabled={updateTrainerMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmTrainerUpdate}
                disabled={updateTrainerMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updateTrainerMutation.isPending ? "Updating..." : "Update Trainer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}