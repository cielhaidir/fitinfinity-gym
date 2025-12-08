"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/datatable/data-table";
import { Package, Users, Calendar, Clock, CreditCard, Edit, ArrowRightLeft, MoreHorizontal, TrendingUp, UserCheck, UserPlus, User, Download, Trash2 } from "lucide-react";
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
import { useRBAC } from "@/hooks/useRBAC";

export default function AdminSubscriptionHistoryPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState("member.user.name");
  const [filterSalesId, setFilterSalesId] = useState<string>("all");
  const [filterTrainerId, setFilterTrainerId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
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
  
  // Edit Remaining Sessions functionality state
  const [editSessionsDialogOpen, setEditSessionsDialogOpen] = useState(false);
  const [selectedSubscriptionForSessions, setSelectedSubscriptionForSessions] = useState<any>(null);
  const [editRemainingSessions, setEditRemainingSessions] = useState<number>(0);
  
  // Delete functionality state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubscriptionForDelete, setSelectedSubscriptionForDelete] = useState<any>(null);
  
  const { toast } = useToast();
  const { hasPermission } = useRBAC();

  // Query for getting all subscriptions with required fields
  const { data: subscriptions, isLoading, refetch } = api.subs.listActive.useQuery(
    {
      page,
      limit,
      search: search || undefined,
      searchColumn: searchColumn || undefined,
      salesId: filterSalesId !== "all" ? filterSalesId : undefined,
      trainerId: filterTrainerId !== "all" ? filterTrainerId : undefined,
      status: filterStatus,
      startDate: filterStartDate ? new Date(filterStartDate) : undefined,
      endDate: filterEndDate ? new Date(filterEndDate) : undefined,
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

  // Mutation for deleting subscription
  const deleteSubscriptionMutation = api.subs.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Subscription deleted successfully",
      });
      setDeleteDialogOpen(false);
      setSelectedSubscriptionForDelete(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete subscription",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating remaining sessions
  const updateRemainingSessionsMutation = api.subs.updateRemainingSessions.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Remaining sessions updated successfully",
      });
      setEditSessionsDialogOpen(false);
      setSelectedSubscriptionForSessions(null);
      setEditRemainingSessions(0);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update remaining sessions",
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

  // Edit Remaining Sessions functionality handlers
  const handleEditSessions = (subscription: any) => {
    setSelectedSubscriptionForSessions(subscription);
    setEditRemainingSessions(subscription.remainingSessions || 0);
    setEditSessionsDialogOpen(true);
  };

  const handleConfirmSessionsUpdate = async () => {
    if (!selectedSubscriptionForSessions) return;

    if (editRemainingSessions < 0) {
      toast({
        title: "Error",
        description: "Remaining sessions cannot be negative",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateRemainingSessionsMutation.mutateAsync({
        subscriptionId: selectedSubscriptionForSessions.id,
        remainingSessions: editRemainingSessions,
      });
    } catch (error) {
      console.error("Failed to update remaining sessions:", error);
    }
  };

  const handleCancelSessionsEdit = () => {
    setEditSessionsDialogOpen(false);
    setSelectedSubscriptionForSessions(null);
    setEditRemainingSessions(0);
  };

  // Delete functionality handlers
  const handleDeleteSubscription = (subscription: any) => {
    setSelectedSubscriptionForDelete(subscription);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedSubscriptionForDelete) return;

    deleteSubscriptionMutation.mutate({
      id: selectedSubscriptionForDelete.id,
    });
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedSubscriptionForDelete(null);
  };

  // Navigation functions - open in new tab
  const directToSubs = (member: any) => {
    window.open(`/checkout/${member.userId}`, '_blank');
  };

  const directToProfile = (member: any) => {
    window.open(`/member/profile?memberId=${member.id}`, '_blank');
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
      accessorKey: "trainer",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Personal Trainer" />
      ),
      cell: ({ row }) => {
        const trainerName = row.original.trainer?.user?.name;
        return (
          <div className="min-w-[100px]">
            <span className="text-sm truncate block">{trainerName || "N/A"}</span>
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
      id: "payment",
      accessorKey: "payments",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Payment Total" />
      ),
      cell: ({ row }) => {
        const payments = row.original.payments as Array<{ totalPayment: number }> | undefined;
        const totalPayment = payments?.[0]?.totalPayment;
        return (
          <div className="min-w-[100px]">
        <span className="text-sm font-medium">
          {totalPayment != null ? `Rp ${totalPayment.toLocaleString('id-ID')}` : "N/A"}
        </span>
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
                <DropdownMenuItem onClick={() => directToProfile(row.original.member)}>
                  <User className="mr-2 h-4 w-4" />
                  Member Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => directToSubs(row.original.member)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  New Subscription
                </DropdownMenuItem>
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
                 {(row.original.package?.type === "PERSONAL_TRAINER" || row.original.package?.type === "GROUP_TRAINING") && (
                   <DropdownMenuItem onClick={() => handleEditTrainer(row.original)}>
                     <UserCheck className="mr-2 h-4 w-4" />
                     Edit Personal Trainer
                   </DropdownMenuItem>
                 )}
                 {(row.original.package?.type === "PERSONAL_TRAINER" || row.original.package?.type === "GROUP_TRAINING") && (
                   <DropdownMenuItem onClick={() => handleEditSessions(row.original)}>
                     <Clock className="mr-2 h-4 w-4" />
                     Edit Remaining Sessions
                   </DropdownMenuItem>
                 )}
                 {hasPermission("delete:subscription") && (
                   <DropdownMenuItem
                     onClick={() => handleDeleteSubscription(row.original)}
                     className="text-red-600 focus:text-red-600"
                   >
                     <Trash2 className="mr-2 h-4 w-4" />
                     Delete
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

  const handleSalesFilterChange = (salesId: string) => {
    setFilterSalesId(salesId);
    setPage(1);
  };

  const handleTrainerFilterChange = (trainerId: string) => {
    setFilterTrainerId(trainerId);
    setPage(1);
  };

  const handleStatusFilterChange = (status: "all" | "active" | "inactive") => {
    setFilterStatus(status);
    setPage(1);
  };

  const handleStartDateChange = (date: string) => {
    setFilterStartDate(date);
    setPage(1);
  };

  const handleEndDateChange = (date: string) => {
    setFilterEndDate(date);
    setPage(1);
  };

  // Query for export - fetch all data without pagination
  const [shouldExport, setShouldExport] = useState(false);
  const { data: exportData, isLoading: isExporting } = api.subs.listAllForExport.useQuery(
    {
      salesId: filterSalesId !== "all" ? filterSalesId : undefined,
      trainerId: filterTrainerId !== "all" ? filterTrainerId : undefined,
      status: filterStatus,
      startDate: filterStartDate ? new Date(filterStartDate) : undefined,
      endDate: filterEndDate ? new Date(filterEndDate) : undefined,
    },
    {
      enabled: shouldExport,
    }
  );

  // Effect to handle export when data is fetched
  useEffect(() => {
    if (shouldExport && exportData && !isExporting) {
      performExport(exportData);
      setShouldExport(false);
    }
  }, [shouldExport, exportData, isExporting]);


  // Export function - trigger data fetch
  const handleExportCSV = () => {
    if (!subscriptions || subscriptions.items.length === 0) {
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
        "Package Name",
        "Package Points",
        "Start Date",
        "End Date",
        "Remaining Sessions",
        "Personal Trainer",
        "Sales Person",
        "Payment Total",
        "Status"
      ];

      // Prepare CSV rows
      const rows = allData.map(item => [
        item.member?.user?.name || "N/A",
        item.member?.user?.email || "N/A",
        item.package?.name || "N/A",
        item.package?.point || "N/A",
        item.startDate ? format(new Date(item.startDate), "dd/MM/yyyy") : "N/A",
        item.endDate ? format(new Date(item.endDate), "dd/MM/yyyy") : "N/A",
        item.remainingSessions ?? "N/A",
        item.trainer?.user?.name || "N/A",
        getSalesPersonName(item.salesId, item.salesType),
        item.payments?.[0]?.totalPayment || "N/A",
        item.isActive ? "Active" : "Inactive"
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
      link.setAttribute("download", `subscription-history-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`);
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
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Subscription History</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                View all subscription history with detailed member and package information
              </p>
            </div>
            <Button
              onClick={handleExportCSV}
              disabled={isLoading || !subscriptions || subscriptions.items.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <Card className="w-full">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">All Subscriptions</CardTitle>
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mt-4">
                <div>
                  <Label htmlFor="salesFilter" className="text-sm font-medium mb-2 block">
                    Filter by Sales
                  </Label>
                  <Select
                    value={filterSalesId}
                    onValueChange={handleSalesFilterChange}
                  >
                    <SelectTrigger id="salesFilter">
                      <SelectValue placeholder="All Sales" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sales</SelectItem>
                      {salesList?.map((sales) => (
                        <SelectItem key={sales.id} value={sales.id}>
                          {sales.name} ({sales.typeName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="trainerFilter" className="text-sm font-medium mb-2 block">
                    Filter by Trainer
                  </Label>
                  <Select
                    value={filterTrainerId}
                    onValueChange={handleTrainerFilterChange}
                  >
                    <SelectTrigger id="trainerFilter">
                      <SelectValue placeholder="All Trainers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Trainers</SelectItem>
                      {personalTrainers?.map((trainer) => (
                        <SelectItem key={trainer.id} value={trainer.id}>
                          {trainer.user?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="statusFilter" className="text-sm font-medium mb-2 block">
                    Filter by Status
                  </Label>
                  <Select
                    value={filterStatus}
                    onValueChange={handleStatusFilterChange}
                  >
                    <SelectTrigger id="statusFilter">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startDateFilter" className="text-sm font-medium mb-2 block">
                    Start Date From
                  </Label>
                  <Input
                    id="startDateFilter"
                    type="date"
                    value={filterStartDate}
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
                    value={filterEndDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
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
                {/* Subtotal Row */}
                {subscriptions && subscriptions.items.length > 0 && (
                  <div className="border-t mt-4 pt-4 px-4 sm:px-6">
                    <div className="flex justify-end items-center gap-4">
                      <span className="text-sm font-semibold text-muted-foreground">
                        Page Subtotal:
                      </span>
                      <span className="text-lg font-bold">
                        Rp {subscriptions.items.reduce((sum, item) => {
                          const payment = item.payments?.[0]?.totalPayment || 0;
                          return sum + payment;
                        }, 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                )}
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

        {/* Edit Remaining Sessions Dialog */}
        <Dialog open={editSessionsDialogOpen} onOpenChange={setEditSessionsDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[425px] mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Edit Remaining Sessions</DialogTitle>
              <DialogDescription className="text-sm">
                {selectedSubscriptionForSessions && (
                  <>
                    Update the remaining sessions for <strong>{selectedSubscriptionForSessions.member?.user?.name}</strong>'s subscription.
                    Current package: <strong>{selectedSubscriptionForSessions.package?.name}</strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="remainingSessions" className="text-sm font-medium">
                  Remaining Sessions *
                </Label>
                <Input
                  id="remainingSessions"
                  type="number"
                  min="0"
                  value={editRemainingSessions}
                  onChange={(e) => setEditRemainingSessions(parseInt(e.target.value) || 0)}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">
                  Current remaining sessions: {selectedSubscriptionForSessions?.remainingSessions ?? "N/A"}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelSessionsEdit}
                disabled={updateRemainingSessionsMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSessionsUpdate}
                disabled={updateRemainingSessionsMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {updateRemainingSessionsMutation.isPending ? "Updating..." : "Update Sessions"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Subscription Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[425px] mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Delete Subscription</DialogTitle>
              <DialogDescription className="text-sm">
                Are you sure you want to delete this subscription? This action cannot be undone.
                The subscription will be permanently deleted and associated payments will be soft deleted.
              </DialogDescription>
            </DialogHeader>
            
            {selectedSubscriptionForDelete && (
              <div className="space-y-2 py-4">
                <p className="text-sm">
                  <span className="font-semibold">Member:</span>{" "}
                  {selectedSubscriptionForDelete.member?.user?.name}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Package:</span>{" "}
                  {selectedSubscriptionForDelete.package?.name}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Start Date:</span>{" "}
                  {selectedSubscriptionForDelete.startDate
                    ? format(new Date(selectedSubscriptionForDelete.startDate), "dd/MM/yyyy")
                    : "N/A"}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">End Date:</span>{" "}
                  {selectedSubscriptionForDelete.endDate
                    ? format(new Date(selectedSubscriptionForDelete.endDate), "dd/MM/yyyy")
                    : "N/A"}
                </p>
                {selectedSubscriptionForDelete.payments?.[0]?.totalPayment && (
                  <p className="text-sm">
                    <span className="font-semibold">Payment Amount:</span>{" "}
                    Rp {selectedSubscriptionForDelete.payments[0].totalPayment.toLocaleString('id-ID')}
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelDelete}
                disabled={deleteSubscriptionMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteSubscriptionMutation.isPending}
              >
                {deleteSubscriptionMutation.isPending ? "Deleting..." : "Delete"}
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