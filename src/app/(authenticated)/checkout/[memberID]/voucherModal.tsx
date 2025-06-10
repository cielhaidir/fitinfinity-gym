import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoucherApplied: (voucher: {
    id: string;
    name: string;
    amount: number;
    discountType: "PERCENT" | "CASH";
  }) => void;
  currentVoucher?: {
    id: string;
    name: string;
    amount: number;
    discountType: "PERCENT" | "CASH";
  };
}

export function VoucherModal({
  isOpen,
  onClose,
  onVoucherApplied,
  currentVoucher,
}: VoucherModalProps) {
  const [referralCode, setReferralCode] = useState("");
  const utils = api.useUtils();
  const { data: generalVouchers = [] } = api.voucher.list.useQuery({
    type: "GENERAL",
    isActive: true,
  });

  const claimVoucherMutation = api.voucher.claim.useMutation({
    onSuccess: (voucher) => {
      toast.success("Voucher berhasil diapply");
      onVoucherApplied(voucher);
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const applyVoucher = async (voucher: {
    id: string;
    name: string;
    amount: number;
    discountType: "PERCENT" | "CASH";
  }) => {
    try {
      // Check if this is the currently applied voucher
      if (currentVoucher?.id === voucher.id) {
        toast.error("Voucher ini sudah diapply");
        return;
      }

      await claimVoucherMutation.mutateAsync({ voucherId: voucher.id });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const removeVoucher = () => {
    onVoucherApplied({ id: "", name: "", amount: 0, discountType: "CASH" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Apply Voucher</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* General Vouchers Section */}
          <div>
            <h3 className="mb-2 text-sm font-medium">Available Vouchers</h3>
            <div className="space-y-2">
              {generalVouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    currentVoucher?.id === voucher.id
                      ? "bg-green-50 dark:bg-green-900/20"
                      : ""
                  }`}
                  onClick={() => applyVoucher(voucher)}
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {voucher.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge
                        variant={
                          voucher.discountType === "PERCENT"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {voucher.discountType === "PERCENT"
                          ? `${voucher.amount}%`
                          : `Rp ${voucher.amount.toLocaleString()}`}
                      </Badge>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Sisa {voucher.maxClaim - voucher._count.claims} voucher
                      </span>
                    </div>
                  </div>
                  {currentVoucher?.id === voucher.id && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Referral Code Section */}
          <div>
            <h3 className="mb-2 text-sm font-medium">Referral Code</h3>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter referral code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (referralCode) {
                    claimVoucherMutation.mutateAsync({ referralCode });
                  }
                }}
              >
                Apply
              </Button>
            </div>
          </div>

          {/* Remove Voucher Button */}
          {currentVoucher && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={removeVoucher}
            >
              <X className="mr-2 h-4 w-4" />
              Remove Voucher
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
