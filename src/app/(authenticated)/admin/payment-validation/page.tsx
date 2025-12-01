"use client";

import React, { useState } from "react";
import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PaymentValidationStatus } from "@prisma/client"; // For potential filtering if needed
import Link from "next/link";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TRPCClientError } from "@trpc/client";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

// Define a type for the items, aligning with what listWaiting returns
// This should ideally be inferred or imported from your tRPC types if possible
export type PaymentValidationItem = {
  id: string;
  createdAt: Date;
  filePath: string | null;
  totalPayment: number;
  subsType: string;
  member: {
    user: {
      name?: string | null;
      email?: string | null;
    } | null;
  } | null;
  package: {
    name?: string | null;
  } | null;
  trainer?: {
    user: {
      name?: string | null;
    } | null;
  } | null;
};

export default function AdminPaymentValidationPage() {
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<
    "accept" | "decline" | null
  >(null);
  const [selectedValidationId, setSelectedValidationId] = useState<
    string | null
  >(null);
  const [selectedBalanceId, setSelectedBalanceId] = useState<number | null>(
    null,
  );
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [isProcessing, setIsProcessing] = useState(false);

  // Query for payment validations
  const {
    data: validationData,
    isLoading,
    error: queryError,
    refetch,
  } = api.paymentValidation.listWaiting.useQuery({ page, limit });
  // Query for balance accounts
  const { data: balanceAccountsData } = api.balanceAccount.getAll.useQuery({});
  const accounts = balanceAccountsData?.items ?? [];

  // Mutation for accepting payment
  const acceptMutation = api.paymentValidation.accept.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Payment accepted. Subscription ID: ${data.subscriptionId}`,
      );
      void utils.paymentValidation.listWaiting.invalidate();
    },
    onError: (err) => {
      console.error("Error accepting payment:", err);
      if (err instanceof TRPCClientError) {
        toast.error(`Failed to accept payment: ${err.message}`);
      } else {
        toast.error("An unexpected error occurred while accepting payment");
      }
    },
  });

  // Mutation for declining payment
  const declineMutation = api.paymentValidation.decline.useMutation({
    onSuccess: () => {
      toast.success("Payment declined successfully.");
      void utils.paymentValidation.listWaiting.invalidate();
    },
    onError: (err) => {
      console.error("Error declining payment:", err);
      if (err instanceof TRPCClientError) {
        toast.error(`Failed to decline payment: ${err.message}`);
      } else {
        toast.error("An unexpected error occurred while declining payment");
      }
    },
  });

  const handleAccept = (id: string) => {
    setSelectedValidationId(id);
    setSelectedAction("accept");
    setPaymentDate(new Date()); // Reset to current date
    setShowConfirmModal(true);
  };

  const handleDecline = (id: string) => {
    setSelectedValidationId(id);
    setSelectedAction("decline");
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    // Prevent double-click
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      if (
        selectedAction === "accept" &&
        selectedValidationId &&
        selectedBalanceId
      ) {
        await acceptMutation.mutateAsync({
          id: selectedValidationId,
          balanceId: selectedBalanceId,
          paymentDate: paymentDate,
        });
      } else if (selectedAction === "decline" && selectedValidationId) {
        await declineMutation.mutateAsync({ id: selectedValidationId });
      }
    } finally {
      setIsProcessing(false);
      setShowConfirmModal(false);
      setSelectedValidationId(null);
      setSelectedBalanceId(null);
      setSelectedAction(null);
    }
  };

  const openImageModal = (imageUrl: string) => {
    if (!imageUrl) {
      toast.error("No payment proof available");
      return;
    }
    setSelectedImageUrl(imageUrl);
    setIsImageModalOpen(true);
  };

  const columns = createColumns({
    onAccept: handleAccept,
    onDecline: handleDecline,
    onViewProof: openImageModal,
    isAccepting: acceptMutation.isPending,
    isDeclining: declineMutation.isPending,
  });

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-5">
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading payment validations...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (queryError) {
    return (
      <div className="container mx-auto p-5">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="font-medium text-red-800">Error Loading Data</h3>
          <p className="mt-1 text-red-600">{queryError.message}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void refetch()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermissions={["menu:payment"]}>
      <div className="container mx-auto p-5 md:p-8">
        <div className="mb-6 flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Payment Validations
            </h2>
            <p className="text-muted-foreground">
              Review and process pending direct payments.
            </p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={validationData ?? { items: [], total: 0, page: 1, limit: 10 }}
          onPaginationChange={handlePaginationChange}
          // searchColumns can be added if listWaiting supports search
        />

        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Payment Proof</DialogTitle>
              <DialogDescription>
                Review the uploaded payment proof below.
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
                        "/placeholder-error.png"; // Fallback image
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

        {/* Modal konfirmasi */}
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure?</DialogTitle>
            </DialogHeader>
            {selectedAction === "accept" && (
              <>
                <div className="mb-4">
                  <label
                    htmlFor="balance-account"
                    className="mb-2 block font-medium"
                  >
                    Select Balance Account
                  </label>
                  {accounts.length > 0 ? (
                    <select
                      id="balance-account"
                      className="w-full rounded border px-3 py-2"
                      value={selectedBalanceId ?? ""}
                      onChange={(e) => setSelectedBalanceId(Number(e.target.value))}
                    >
                      <option value="" disabled>
                        Select account
                      </option>
                      {accounts.map((acc: any) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No balance account available.
                    </div>
                  )}
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="payment-date"
                    className="mb-2 block font-medium"
                  >
                    Payment Date
                  </label>
                  <input
                    id="payment-date"
                    type="date"
                    className="w-full rounded border px-3 py-2"
                    value={paymentDate.toISOString().split('T')[0]}
                    onChange={(e) => setPaymentDate(new Date(e.target.value))}
                  />
                </div>
              </>
            )}
            <DialogFooter>
              <Button
                onClick={handleConfirm}
                disabled={(selectedAction === "accept" && !selectedBalanceId) || isProcessing}
              >
                {isProcessing ? "Processing..." : "Confirm"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
