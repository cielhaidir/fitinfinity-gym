"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/datatable/data-table";
import { Receipt, Package, ExternalLink, CreditCard, FileText } from "lucide-react";
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

export default function SubscriptionHistoryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState("member.user.name");

  // Query for getting all subscriptions with payment details
  const { data: subscriptions, isLoading } =
    api.paymentValidation.getAllPayments.useQuery(
      { 
        page, 
        limit, 
        search: search || undefined, 
        searchColumn: searchColumn || undefined 
      },
      {
        enabled: !!session,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        staleTime: 0,
      },
    );
console.log(subscriptions)
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
      duration: subscriptionData.duration || 0, // Assuming duration is in months
    };
    
    setSelectedInvoiceData(invoiceData);
    setIsInvoiceModalOpen(true);
  };

  // Navigate to payment confirmation page for online payments
  const goToPaymentStatus = (orderReference: string, memberId: string) => {
    if (memberId) {
      router.push(
        `/checkout/confirmation/${memberId}?orderRef=${orderReference}`,
      );
    }
  };

  const columns: ColumnDef<any>[] = [
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
    // {
    //   accessorKey: "startDate",
    //   header: ({ column }) => (
    //     <DataTableColumnHeader column={column} title="Start Date" />
    //   ),
    //   cell: ({ row }) => {
    //     const startDate = row.original.startDate;
    //     if (!startDate) return <span className="text-muted-foreground">N/A</span>;
        
    //     const date = new Date(startDate);
    //     return (
    //       <span>
    //         {date.toLocaleDateString("id-ID", {
    //           day: "2-digit",
    //           month: "short",
    //           year: "numeric",
    //         })}
    //       </span>
    //     );
    //   },
    // },
    // {
    //   accessorKey: "endDate",
    //   header: ({ column }) => (
    //     <DataTableColumnHeader column={column} title="End Date" />
    //   ),
    //   cell: ({ row }) => {
    //     const endDate = row.original.endDate;
    //     if (!endDate) return <span className="text-muted-foreground">N/A</span>;
        
    //     const date = new Date(endDate);
    //     const isExpired = date < new Date();
    //     return (
    //       <span className={isExpired ? "text-red-500" : ""}>
    //         {date.toLocaleDateString("id-ID", {
    //           day: "2-digit",
    //           month: "short",
    //           year: "numeric",
    //         })}
    //       </span>
    //     );
    //   },
    // },
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
          <div className="flex space-x-2">
            {/* Generate Invoice Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateInvoice(row.original)}
            >
              <FileText className="mr-2 h-4 w-4" /> Invoice
            </Button>

            {/* For online payments, show a button to check status */}
            {isOnline && orderReference && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPaymentStatus(orderReference, memberId)}
              >
                <ExternalLink className="mr-2 h-4 w-4" /> Details
              </Button>
            )}

            {/* For offline payments, show view proof button if available */}
            {!isOnline && filePath && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openImageModal(filePath)}
              >
                <Receipt className="mr-2 h-4 w-4" /> Proof
              </Button>
            )}
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

      {/* Note about Invoice Generation
      <div className="mb-6">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex">
            <FileText className="h-5 w-5 text-green-500" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Invoice Generation Available
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  You can now generate digital invoices for all subscriptions. Click the "Invoice" button 
                  in the actions column to generate, print, or download invoices for any subscription.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div> */}

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
  );
}