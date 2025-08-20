"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/app/_components/datatable/data-table";
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

export default function PaymentHistoryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Query to get membership for member ID
  const { data: membershipData } = api.member.getByUserId.useQuery(
    { userId: session?.user?.id ?? "" },
    { enabled: !!session?.user?.id },
  );

  // Query for getting all payment types
  const { data: transactions, isLoading } =
    api.paymentValidation.getMemberPayments.useQuery(
      { page, limit, includeOnline: true },
      {
        enabled: !!session,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        staleTime: 0,
      },
    );

  const openImageModal = (imageUrl: string) => {
    if (!imageUrl) {
      return;
    }
    setSelectedImageUrl(imageUrl);
    setIsImageModalOpen(true);
  };

  // Navigate to payment confirmation page for online payments
  const goToPaymentStatus = (orderReference: string) => {
    if (membershipData?.id) {
      router.push(
        `/checkout/confirmation/${membershipData.id}?orderRef=${orderReference}`,
      );
    }
  };

  const columns: ColumnDef<any>[] = [
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
        const method = row.getValue("paymentMethod") as string | null | undefined;
        const isOnline = row.original.isOnlinePayment;
        const displayMethod = method || (isOnline ? "Online" : "Manual");
        return (
          <div className="flex items-center">
            {isOnline ? (
              <CreditCard className="mr-1 h-4 w-4 text-blue-500" />
            ) : (
              <Receipt className="mr-1 h-4 w-4" />
            )}
            <span className="capitalize">
              {displayMethod}
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

        // For online payments, show a button to check status
        if (isOnline) {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPaymentStatus(orderReference)}
              disabled={!orderReference}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              <ExternalLink className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Check Status</span>
              <span className="sm:hidden">Status</span>
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
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              <Receipt className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">View Proof</span>
              <span className="sm:hidden">Proof</span>
            </Button>
          );
        }

        return <span className="text-xs text-muted-foreground sm:text-sm">No action</span>;
      },
    },
  ];

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  return (
    <div className="container mx-auto min-h-screen bg-background p-2 sm:p-4 md:p-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:mb-8 md:flex-row md:items-center md:gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Payment History</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            View your payment history and transaction details
          </p>
        </div>
      </div>

      {/* Cards Section */}
      <div className="mb-6 grid gap-3 sm:gap-4 sm:grid-cols-2 sm:mb-8">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold sm:text-2xl">{transactions?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              All time transactions
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Packages
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold sm:text-2xl">
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
      <div className="rounded-md border bg-card">
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
        <DialogContent className="max-w-[95vw] max-h-[90vh] w-full sm:max-w-xl overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base sm:text-lg">Payment Proof</DialogTitle>
            <DialogDescription className="text-sm">
              Review your uploaded payment proof below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center overflow-auto max-h-[60vh] sm:max-h-[70vh]">
            {selectedImageUrl ? (
              <Link
                href={selectedImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Image
                  src={selectedImageUrl}
                  alt="Payment Proof"
                  width={500}
                  height={700}
                  className="max-w-full h-auto object-contain"
                  style={{
                    maxHeight: "60vh",
                    width: "auto",
                    height: "auto"
                  }}
                  onError={(e) => {
                    console.error("Error loading image:", e);
                    (e.target as HTMLImageElement).src =
                      "/placeholder-error.png";
                    (e.target as HTMLImageElement).alt = "Error loading image";
                  }}
                />
              </Link>
            ) : (
              <p className="text-center text-muted-foreground p-4">
                No image to display or image URL is invalid.
              </p>
            )}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsImageModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
