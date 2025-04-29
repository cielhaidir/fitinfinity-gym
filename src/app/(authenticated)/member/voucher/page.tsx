"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function VoucherPage() {
  const router = useRouter();
  const utils = api.useUtils();

  // Fetch available vouchers
  const { data: vouchers, isLoading } = api.voucher.list.useQuery({
    page: 1,
    limit: 10,
  });

  const { mutate: claimVoucher, isPending: isClaiming } = api.voucher.claim.useMutation({
    onSuccess: (data) => {
      toast.success("Voucher claimed successfully");
      router.push(`/checkout?voucherId=${data.voucherId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleClaimVoucher = (voucherId: string) => {
    claimVoucher({ voucherId });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen bg-background">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Available Vouchers
          </h2>
          <p className="text-muted-foreground">
            Claim vouchers to get discounts on your subscription
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {(vouchers?.items || []).map((voucher) => {
          const isExpired = voucher.expiryDate ? new Date(voucher.expiryDate) < new Date() : false;
          const isInactive = !voucher.isActive;
          return (
            <div
              key={voucher.id}
              className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 flex flex-col gap-4 border border-gray-200 dark:border-gray-800"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold flex-1">{voucher.name}</h3>
                <Badge variant={voucher.discountType === "PERCENT" ? "default" : "secondary"}>
                  {voucher.discountType === "PERCENT" ? "Percentage" : "Fixed Amount"}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-infinity">
                {voucher.discountType === "PERCENT"
                  ? `${voucher.amount}%`
                  : `Rp ${voucher.amount.toLocaleString()}`}
              </div>
              <div className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
                <span>Expiry: {voucher.expiryDate ? format(new Date(voucher.expiryDate), "dd MMM yyyy") : "No expiry"}</span>
              </div>
              <Button
                onClick={() => handleClaimVoucher(voucher.id)}
                disabled={isExpired || isInactive || isClaiming}
                variant="default"
                size="sm"
                className="mt-2"
              >
                Claim Voucher
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
