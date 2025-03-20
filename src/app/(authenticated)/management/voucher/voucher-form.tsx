"use client";

import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Voucher } from "./schema";
import { useState, useEffect } from "react";

type VoucherFormProps = {
  voucher: Partial<Voucher>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
  onCreateOrUpdateVoucher: () => void;
  isEditMode: boolean;
};

export const VoucherForm: React.FC<VoucherFormProps> = ({
  voucher,
  onInputChange,
  onSelectChange,
  onCreateOrUpdateVoucher,
  isEditMode,
}) => {
  const [currentDiscountType, setCurrentDiscountType] = useState(voucher.discountType || "CASH");
  const [amountInput, setAmountInput] = useState(voucher.amount?.toString() || "0");

  useEffect(() => {
    setCurrentDiscountType(voucher.discountType || "CASH");
    setAmountInput(voucher.amount?.toString() || "0");
  }, [voucher.discountType, voucher.amount]);
  const handleDiscountTypeChange = (value: "PERCENT" | "CASH") => {
    setCurrentDiscountType(value);
    onSelectChange("discountType", value);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmountInput(value);

    // Convert empty string to 0, otherwise parse the number
    const numericValue = value === "" ? 0 : parseInt(value, 10);
    
    // Create a synthetic event to match the expected onChange interface
    const syntheticEvent = {
      target: {
        name: "amount",
        value: numericValue, // Send as number
        checked: false,
        disabled: false,
        readOnly: false,
        // Add required EventTarget methods
        addEventListener: () => {},
        dispatchEvent: () => true,
        removeEventListener: () => {},
        // Add HTMLInputElement properties
        type: "text",
      },
      currentTarget: {
        name: "amount",
        value: numericValue, // Send as number
        checked: false,
        disabled: false,
        readOnly: false,
        // Add required EventTarget methods
        addEventListener: () => {},
        dispatchEvent: () => true,
        removeEventListener: () => {},
        type: "text",
      },
      nativeEvent: new Event('input'),
      bubbles: true,
      cancelable: true,
      defaultPrevented: false,
      eventPhase: Event.AT_TARGET,
      isTrusted: true,
      preventDefault: () => {},
      stopPropagation: () => {},
      isDefaultPrevented: () => false,
      isPropagationStopped: () => false,
      persist: () => {},
      timeStamp: Date.now(),
      type: 'change'
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    onInputChange(syntheticEvent);
  };

  return (
    <SheetContent side="right" className="w-full overflow-y-auto">
      <SheetHeader>
        <SheetTitle>
          {isEditMode ? "Edit Voucher" : "Create New Voucher"}
        </SheetTitle>
        <SheetDescription>
          {isEditMode
            ? "Edit the voucher details below."
            : "Add a new voucher to the system."}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-4 py-8">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Voucher Name
          </label>
          <Input
            id="name"
            name="name"
            placeholder="Enter voucher name"
            value={voucher.name ?? ""}
            onChange={onInputChange}
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium mb-2">
            Voucher Type
          </label>
          <Select
            value={voucher.type}
            onValueChange={(value) => onSelectChange("type", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select voucher type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GENERAL">General</SelectItem>
              <SelectItem value="REFERRAL">Referral</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="discountType" className="block text-sm font-medium mb-2">
            Discount Type
          </label>
          <Select
            value={currentDiscountType}
            onValueChange={handleDiscountTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select discount type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Cash Amount</SelectItem>
              <SelectItem value="PERCENT">Percentage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-2">
            {currentDiscountType === "PERCENT" ? "Discount Percentage (%)" : "Discount Amount (Rp)"}
          </label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min={0}
            max={currentDiscountType === "PERCENT" ? 100 : undefined}
            placeholder={
              currentDiscountType === "PERCENT"
                ? "Enter percentage (0-100)"
                : "Enter amount in Rupiah"
            }
            value={amountInput}
            onChange={handleAmountChange}
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {currentDiscountType === "PERCENT" && (
            <p className="text-sm text-muted-foreground mt-1">
              Maximum discount percentage is 100%
            </p>
          )}
        </div>

        <div>
          <label htmlFor="maxClaim" className="block text-sm font-medium mb-2">
            Maximum Claims
          </label>
          <Input
            id="maxClaim"
            name="maxClaim"
            type="number"
            min={1}
            placeholder="Enter maximum number of claims"
            value={voucher.maxClaim ?? 1}
            onChange={onInputChange}
          />
        </div>

        {voucher.type === "REFERRAL" && (
          <div>
            <label htmlFor="referralCode" className="block text-sm font-medium mb-2">
              Referral Code
            </label>
            <Input
              id="referralCode"
              name="referralCode"
              placeholder="Enter referral code"
              value={voucher.referralCode ?? ""}
              onChange={onInputChange}
            />
          </div>
        )}
      </div>

      <SheetFooter className="flex justify-end gap-2">
        <Button
          onClick={onCreateOrUpdateVoucher}
          className="bg-infinity hover:bg-infinity/90"
        >
          {isEditMode ? "Update Voucher" : "Create Voucher"}
        </Button>
        <SheetClose asChild>
          <Button variant="outline">Cancel</Button>
        </SheetClose>
      </SheetFooter>
    </SheetContent>
  );
}; 