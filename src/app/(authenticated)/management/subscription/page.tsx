"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/datatable/data-table";
import { Receipt, Package, ExternalLink, CreditCard } from "lucide-react";
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
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function PaymentHistoryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Query for getting all payment types
  const { data: transactions, isLoading } =
    api.paymentValidation.getAllPayments.useQuery(
      { page, limit },
      {
        enabled: !!session,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        staleTime: 0,
      },
    );

  if (transactions?.items) {
    console.log(transactions.items);
  }
  const openImageModal = (imageUrl: string) => {
    if (!imageUrl) {
      return;
    }
    setSelectedImageUrl(imageUrl);
    setIsImageModalOpen(true);
  };

  // Navigate to payment confirmation page for online payments
  const goToPaymentStatus = (orderReference: string, memberId: string) => {
    console.log(
      "Navigating to payment status for order:",
      orderReference,
      "and member:",
      memberId,
    );
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
        return (
          <div className="flex items-center">
            <span className="font-medium">{memberName || "N/A"}</span>
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
        const trainerName = row.original.trainer?.user?.name;
        const subsType = row.original.subsType;
        return (
          <div className="flex flex-col">
            <span>{packageName || "N/A"}</span>
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
        return <div className="font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Transaction Date" />
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return (
          <span>
            {date.toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        );
      },
    },
    {
      accessorKey: "paymentMethod",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Method" />
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
              {method || (isOnline ? "Online" : "Manual")}
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
            label = "Accepted";
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
        const status = row.original.paymentStatus;
        const memberId = row.original.member.id;

        // For online payments, show a button to check status
        if (isOnline) {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPaymentStatus(orderReference, memberId)}
              disabled={!orderReference}
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Check Status
            </Button>
          );
        }

        // For offline payments, show view proof button if available
        if (filePath) {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openImageModal(filePath)}
            >
              <Receipt className="mr-2 h-4 w-4" /> View Proof
            </Button>
          );
        }

        return <span className="text-sm text-muted-foreground">No action</span>;
      },
    },
  ];

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  return (
    <ProtectedRoute requiredPermissions={["menu:subscription"]}>
    <div className="container mx-auto min-h-screen bg-background p-4 md:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Payment History</h2>
          <p className="text-muted-foreground">
            View your payment history and transaction details
          </p>
        </div>
      </div>

      {/* Cards Section */}
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              All time transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Packages
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(transactions?.items.map((t) => t.package?.name)).size ??
                0}
            </div>
            <p className="text-xs text-muted-foreground">
              Different package types purchased
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <div className="rounded-md border">
        <DataTable
          columns={columns}
          data={transactions ?? { items: [], total: 0, page: 1, limit: 10 }}
          searchColumns={[
            { id: "package.name", placeholder: "Search by package..." },
          ]}
          isLoading={isLoading}
          onPaginationChange={handlePaginationChange}
        />
      </div>

      {/* Image Preview Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
            <DialogDescription>
              Review your uploaded payment proof below.
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
