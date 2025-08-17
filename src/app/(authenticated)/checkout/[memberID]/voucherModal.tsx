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
  onVoucherApplied: (vouchers: {
    id: string;
    name: string;
    amount: number;
    discountType: "PERCENT" | "CASH";
    minimumPurchase?: number | null;
    allowStack?: boolean;
  }[]) => void;
  currentVouchers?: {
    id: string;
    name: string;
    amount: number;
    discountType: "PERCENT" | "CASH";
    minimumPurchase?: number | null;
    allowStack?: boolean;
  }[];
  packagePrice?: number;
}

export function VoucherModal({
  isOpen,
  onClose,
  onVoucherApplied,
  currentVouchers = [],
  packagePrice = 0,
}: VoucherModalProps) {
  const [referralCode, setReferralCode] = useState("");
  const utils = api.useUtils();
  const { data: generalVouchers = [] } = api.voucher.list.useQuery({
    type: "GENERAL",
    isActive: true,
  });

  const claimVoucherMutation = api.voucher.claim.useMutation({
    onSuccess: (voucher) => {
      const newVoucher = {
        id: voucher.id,
        name: voucher.name,
        amount: voucher.amount,
        discountType: voucher.discountType,
        minimumPurchase: voucher.minimumPurchase,
        allowStack: voucher.allowStack,
      };

      // Check if voucher allows stacking
      if (newVoucher.allowStack && currentVouchers.length > 0) {
        // Add to existing vouchers
        const updatedVouchers = [...currentVouchers, newVoucher];
        onVoucherApplied(updatedVouchers);
        toast.success("Voucher berhasil ditambahkan");
      } else if (currentVouchers.length === 0) {
        // First voucher
        onVoucherApplied([newVoucher]);
        toast.success("Voucher berhasil diapply");
      } else {
        // Replace existing vouchers if stacking not allowed
        onVoucherApplied([newVoucher]);
        toast.success("Voucher berhasil diapply (voucher sebelumnya telah diganti)");
      }
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
    minimumPurchase?: number | null;
    allowStack?: boolean;
  }) => {
    try {
      // Check if this voucher is already applied
      const isAlreadyApplied = currentVouchers.some(v => v.id === voucher.id);
      if (isAlreadyApplied) {
        toast.error("Voucher ini sudah diapply");
        return;
      }

      // Check minimum purchase requirement
      if (voucher.minimumPurchase && packagePrice < voucher.minimumPurchase) {
        toast.error(`Minimum pembelian untuk voucher ini adalah Rp ${voucher.minimumPurchase.toLocaleString()}`);
        return;
      }

      // Check if current vouchers allow stacking
      if (currentVouchers.length > 0) {
        const hasStackableVoucher = currentVouchers.some(v => v.allowStack);
        if (!hasStackableVoucher && !voucher.allowStack) {
          toast.error("Voucher ini tidak bisa dikombinasikan dengan voucher yang sudah ada");
          return;
        }
      }

      await claimVoucherMutation.mutateAsync({
        voucherId: voucher.id,
        purchaseAmount: packagePrice
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const removeVoucher = (voucherId: string) => {
    const updatedVouchers = currentVouchers.filter(v => v.id !== voucherId);
    onVoucherApplied(updatedVouchers);
    toast.success("Voucher telah dihapus");
  };

  const removeAllVouchers = () => {
    onVoucherApplied([]);
    toast.success("Semua voucher telah dihapus");
  };

  const isVoucherApplied = (voucherId: string) => {
    return currentVouchers.some(v => v.id === voucherId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply Voucher</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Applied Vouchers Section */}
          {currentVouchers.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Applied Vouchers</h3>
              <div className="space-y-2">
                {currentVouchers.map((voucher) => (
                  <div
                    key={voucher.id}
                    className="flex items-center justify-between rounded-lg border p-3 bg-green-50 dark:bg-green-900/20"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {voucher.name}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="default">
                          {voucher.discountType === "PERCENT"
                            ? `${voucher.amount}%`
                            : `Rp ${voucher.amount.toLocaleString()}`}
                        </Badge>
                        {voucher.allowStack && (
                          <Badge variant="outline" className="text-xs">
                            Stackable
                          </Badge>
                        )}
                        {voucher.minimumPurchase && voucher.minimumPurchase > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Min: Rp {voucher.minimumPurchase.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVoucher(voucher.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* General Vouchers Section */}
          <div>
            <h3 className="mb-2 text-sm font-medium">Available Vouchers</h3>
            <div className="space-y-2">
              {generalVouchers.map((voucher) => {
                const isApplied = isVoucherApplied(voucher.id);
                const meetsMinimum = !voucher.minimumPurchase || packagePrice >= voucher.minimumPurchase;
                
                return (
                  <div
                    key={voucher.id}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                      isApplied
                        ? "bg-green-50 dark:bg-green-900/20 opacity-50"
                        : meetsMinimum
                        ? "hover:bg-gray-100 dark:hover:bg-gray-800"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                    onClick={() => {
                      if (!isApplied && meetsMinimum) {
                        applyVoucher(voucher);
                      }
                    }}
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {voucher.name}
                      </div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
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
                        {voucher.allowStack && (
                          <Badge variant="outline" className="text-xs">
                            Stackable
                          </Badge>
                        )}
                        {voucher.minimumPurchase && voucher.minimumPurchase > 0 && (
                          <Badge
                            variant={meetsMinimum ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            Min: Rp {voucher.minimumPurchase.toLocaleString()}
                          </Badge>
                        )}
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Sisa {voucher.maxClaim - voucher._count.claims} voucher
                        </span>
                      </div>
                    </div>
                    {isApplied && (
                      <Check className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                );
              })}
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
                    claimVoucherMutation.mutateAsync({
                      referralCode,
                      purchaseAmount: packagePrice
                    });
                  }
                }}
              >
                Apply
              </Button>
            </div>
          </div>

          {/* Remove All Vouchers Button */}
          {currentVouchers.length > 0 && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={removeAllVouchers}
            >
              <X className="mr-2 h-4 w-4" />
              Remove All Vouchers
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
