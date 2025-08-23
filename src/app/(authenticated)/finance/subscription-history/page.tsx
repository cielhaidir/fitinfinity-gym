"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/datatable/data-table";
import { Receipt, Package, ExternalLink, CreditCard, FileText, Edit3, MoreHorizontal, Files } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { InvoiceGenerator } from "./components/invoice-generator";
import { CombinedInvoiceGenerator } from "./components/combined-invoice-generator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function SubscriptionHistoryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState("member.user.name");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isEditSalesModalOpen, setIsEditSalesModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>("");
  const [selectedSalesType, setSelectedSalesType] = useState<string>("");
  
  // Multi-select state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isCombinedInvoiceModalOpen, setIsCombinedInvoiceModalOpen] = useState(false);

  // Query for getting all subscriptions with payment details
  const { data: subscriptions, isLoading, refetch } =
    api.paymentValidation.getAllPayments.useQuery(
      { 
        page, 
        limit, 
        search: search || undefined, 
        searchColumn: searchColumn || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined
      },
      {
        enabled: !!session,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        staleTime: 0,
      },
    );

  // Query for getting sales list
  const { data: salesList } = api.subs.getSalesList.useQuery(undefined, {
    enabled: !!session,
  });

  const openImageModal = (imageUrl: string) => {
    if (!imageUrl) {
      return;
    }
    setSelectedImageUrl(imageUrl);
    setIsImageModalOpen(true);
  };

  // Generate invoice/receipt for a subscription
  const generateInvoice = (subscriptionData: any) => {
    const invoiceData = {
      id: subscriptionData.id,
      memberName: subscriptionData.member?.user?.name || "N/A",
      memberEmail: subscriptionData.member?.user?.email || "N/A",
      packageName: subscriptionData.package?.name || "N/A",
      amount: parseFloat(subscriptionData.totalPayment || "0"),
      paymentMethod: subscriptionData.paymentMethod || "Manual Payment",
      paymentStatus: subscriptionData.paymentStatus || "PENDING",
      startDate: subscriptionData.startDate,
      endDate: subscriptionData.endDate,
      createdAt: subscriptionData.createdAt,
      subsType: subscriptionData.subsType || "gym",
      trainerName: subscriptionData.trainer?.user?.name,
      duration: subscriptionData.duration || 0,
      salesPerson: subscriptionData.salesPerson,
      salesType: subscriptionData.salesType,
      // Add discount/voucher fields if available
      discount: subscriptionData.discount || 0,
      discountPercent: subscriptionData.discountPercent || 0,
      voucherCode: subscriptionData.voucherCode || subscriptionData.voucher?.code || '',
      originalPrice: subscriptionData.originalPrice || subscriptionData.package?.price || parseFloat(subscriptionData.totalPayment || "0"),
    };
    
    setSelectedInvoiceData(invoiceData);
    setIsInvoiceModalOpen(true);
  };

  // Multi-select helper functions
  const handleRowSelect = (rowId: string, isSelected: boolean) => {
    const newSelectedRows = new Set(selectedRows);
    if (isSelected) {
      newSelectedRows.add(rowId);
    } else {
      newSelectedRows.delete(rowId);
    }
    setSelectedRows(newSelectedRows);
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      const allRowIds = subscriptions?.items?.map((item) => item.id) || [];
      setSelectedRows(new Set(allRowIds));
    } else {
      setSelectedRows(new Set());
    }
  };

  const generateCombinedInvoice = () => {
    if (selectedRows.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one transaction to generate a combined invoice.",
        variant: "destructive",
      });
      return;
    }

    const selectedSubscriptions = subscriptions?.items?.filter((item) =>
      selectedRows.has(item.id)
    ) || [];

    if (selectedSubscriptions.length === 0) {
      toast({
        title: "Error",
        description: "Selected transactions not found.",
        variant: "destructive",
      });
      return;
    }

    // Set the selected data for combined invoice generation
    setSelectedInvoiceData(selectedSubscriptions);
    setIsCombinedInvoiceModalOpen(true);
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  // Navigate to payment confirmation page for online payments
  const goToPaymentStatus = (orderReference: string, memberId: string) => {
    if (memberId) {
      router.push(
        `/checkout/confirmation/${memberId}?orderRef=${orderReference}`,
      );
    }
  };

  // Open edit sales modal
  const openEditSalesModal = (subscription: any) => {
    console.log('Subs', subscription);
    setSelectedSubscription(subscription);
    setSelectedSalesPerson(subscription.salesId || "none");
    setSelectedSalesType(subscription.salesType || "");
    setIsEditSalesModalOpen(true);
  };

  // Update sales information
  const updateSalesMutation = api.subs.updateSales.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sales information updated successfully",
      });
      setIsEditSalesModalOpen(false);
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

  const handleUpdateSales = () => {
    if (!selectedSubscription) {
      toast({
        title: "Error",
        description: "No subscription selected",
        variant: "destructive",
      });
      return;
    }
    // console.log('Selected subs', selectedSubscription)
    // If "none" is selected, pass null values
    const salesId = selectedSalesPerson === "none" ? null : selectedSalesPerson;
    const validSalesType = selectedSalesType === "PersonalTrainer" || selectedSalesType === "FC" ? selectedSalesType : null;
    const salesType = selectedSalesPerson === "none" ? null : validSalesType;

    updateSalesMutation.mutate({
      subscriptionId: selectedSubscription.subscriptionId ,
      salesId: salesId,
      salesType: salesType,
    });
  };

  const columns: ColumnDef<any>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
            handleSelectAll(!!value);
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedRows.has(row.original.id)}
          onCheckedChange={(value) => {
            handleRowSelect(row.original.id, !!value);
          }}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "member.user.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Member" />
      ),
      cell: ({ row }) => {
        const memberName = row.original.member.user.name as string | undefined;
        const memberEmail = row.original.member.user.email as string | undefined;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{memberName || "N/A"}</span>
            <span className="text-xs text-muted-foreground">{memberEmail}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "package.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Subscription Package" />
      ),
      cell: ({ row }) => {
        const packageName = row.original.package?.name;
        const trainerName = row.original.trainer?.user?.name;
        const subsType = row.original.subsType;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{packageName || "N/A"}</span>
            {subsType === "trainer" && trainerName && (
              <span className="text-xs text-muted-foreground">
                Trainer: {trainerName}
              </span>
            )}
            <Badge variant="outline" className="mt-1 w-fit">
              {subsType === "gym" ? "Gym Membership" : "Personal Trainer"}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "salesPerson",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sales Person" />
      ),
      cell: ({ row }) => {
        const salesPerson = row.original.salesPerson;
        const salesType = row.original.salesType;
        
        if (!salesPerson) {
          return <span className="text-muted-foreground">Not assigned</span>;
        }

        const typeLabel = salesType === "PersonalTrainer" ? "PT" : "FC";
        return (
          <div className="flex flex-col">
            <span>{salesPerson}</span>
            <Badge variant="outline" className="w-fit">
              {typeLabel}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "totalPayment",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount" />
      ),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("totalPayment"));
        const formatted = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
        }).format(amount);
        return <div className="font-medium text-green-600">{formatted}</div>;
      },
    },
    {
      accessorKey: "paymentMethod",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Payment Method" />
      ),
      cell: ({ row }) => {
        const method = row.getValue("paymentMethod");
        const isOnline = row.original.isOnlinePayment;
        return (
          <div className="flex items-center">
            {isOnline ? (
              <CreditCard className="mr-1 h-4 w-4 text-blue-500" />
            ) : (
              <Receipt className="mr-1 h-4 w-4" />
            )}
            <span className="capitalize">
              {(method as string) || (isOnline ? "Online Payment" : "Manual Payment")}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "paymentStatus",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue("paymentStatus");
        let variant: "default" | "secondary" | "destructive" | "outline" =
          "default";
        let label = "Waiting";

        switch (status) {
          case "ACCEPTED":
          case "SUCCESS":
            variant = "default";
            label = "Active";
            break;
          case "DECLINED":
          case "FAILED":
          case "EXPIRED":
            variant = "destructive";
            label =
              status === "DECLINED"
                ? "Declined"
                : status === "FAILED"
                  ? "Failed"
                  : "Expired";
            break;
          case "PENDING":
            variant = "secondary";
            label = "Pending";
            break;
          default:
            variant = "secondary";
            label = "Waiting";
        }

        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const isOnline = row.original.isOnlinePayment;
        const orderReference = row.original.orderReference;
        const filePath = row.original.filePath;
        const memberId = row.original.member.id;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditSalesModal(row.original)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Sales
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => generateInvoice(row.original)}>
                <FileText className="mr-2 h-4 w-4" />
                Generate Invoice
              </DropdownMenuItem>
              {isOnline && orderReference && (
                <DropdownMenuItem onClick={() => goToPaymentStatus(orderReference, memberId)}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              )}
              {!isOnline && filePath && (
                <DropdownMenuItem onClick={() => openImageModal(filePath)}>
                  <Receipt className="mr-2 h-4 w-4" />
                  View Proof
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
    setPage(1); // Reset to first page when searching
  };

  // Calculate statistics
  const totalSubscriptions = subscriptions?.total ?? 0;
  const activeSubscriptions = subscriptions?.items?.filter(
    (sub) => sub.paymentStatus === "SUCCESS" || sub.paymentStatus === "ACCEPTED"
  ).length ?? 0;
  const totalRevenue = subscriptions?.items?.reduce(
    (sum, sub) => sum + parseFloat(sub.totalPayment?.toString() || "0"),
    0
  ) ?? 0;

  return (
    <ProtectedRoute requiredPermissions={["menu:finance-subscription-history"]}>
      <div className="container mx-auto min-h-screen bg-background p-4 md:p-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Subscription History</h2>
            <p className="text-muted-foreground">
              View all subscription history with invoice generation capabilities
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Subscriptions
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                All time subscriptions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Subscriptions
              </CardTitle>
              <CreditCard className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                Currently active memberships
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <Receipt className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                }).format(totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                From all subscriptions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Status Filter and Multi-select Actions */}
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Status:</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="SUCCESS">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="DECLINED">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Multi-select Actions */}
          <div className="flex items-center gap-2">
            {selectedRows.size > 0 && (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedRows.size} selected
                </span>
                <Button
                  onClick={generateCombinedInvoice}
                  className="flex items-center gap-2"
                  disabled={selectedRows.size === 0}
                >
                  <Files className="h-4 w-4" />
                  Generate Combined Invoice
                </Button>
                <Button
                  variant="outline"
                  onClick={clearSelection}
                  className="flex items-center gap-2"
                >
                  Clear Selection
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="rounded-md border">
          <DataTable
            columns={columns}
            data={subscriptions ?? { items: [], total: 0, page: 1, limit: 10 }}
            searchColumns={[
              { id: "member.user.name", placeholder: "Search by member name..." },
              { id: "package.name", placeholder: "Search by package..." },
            ]}
            isLoading={isLoading}
            onPaginationChange={handlePaginationChange}
            onSearch={handleSearch}
          />
        </div>

        {/* Invoice Generator Modal */}
        <InvoiceGenerator
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedInvoiceData(null);
          }}
          invoiceData={selectedInvoiceData}
        />

        {/* Combined Invoice Generator Modal */}
        <CombinedInvoiceGenerator
          isOpen={isCombinedInvoiceModalOpen}
          onClose={() => {
            setIsCombinedInvoiceModalOpen(false);
            setSelectedInvoiceData(null);
          }}
          invoiceData={Array.isArray(selectedInvoiceData) ? selectedInvoiceData : null}
        />

        {/* Edit Sales Modal */}
        <Dialog open={isEditSalesModalOpen} onOpenChange={setIsEditSalesModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Sales Information</DialogTitle>
              <DialogDescription>
                Update the sales person associated with this subscription.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Sales Person</label>
                <Select
                  value={selectedSalesPerson}
                  onValueChange={(value) => {
                    setSelectedSalesPerson(value);
                    if (value === "none") {
                      setSelectedSalesType("");
                    } else {
                      const selected = salesList?.find(s => s.id === value);
                      setSelectedSalesType(selected?.type || "");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sales person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {salesList?.map((sales) => (
                      <SelectItem key={sales.id} value={sales.id}>
                        {sales.name} ({sales.type === "PersonalTrainer" ? "PT" : "FC"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditSalesModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateSales}
                disabled={updateSalesMutation.isPending}
              >
                {updateSalesMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Preview Modal */}
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Payment Proof</DialogTitle>
              <DialogDescription>
                Review the uploaded payment proof for this subscription.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex justify-center">
              {selectedImageUrl ? (
                <Link
                  href={selectedImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    src={selectedImageUrl}
                    alt="Payment Proof"
                    width={500}
                    height={700}
                    style={{ objectFit: "contain", maxHeight: "70vh" }}
                    onError={(e) => {
                      console.error("Error loading image:", e);
                      (e.target as HTMLImageElement).src =
                        "/placeholder-error.png";
                      (e.target as HTMLImageElement).alt = "Error loading image";
                    }}
                  />
                </Link>
              ) : (
                <p>No image to display or image URL is invalid.</p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setIsImageModalOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}