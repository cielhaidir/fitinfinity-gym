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
import { type Voucher } from "./schema";
import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "./components/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  const [currentDiscountType, setCurrentDiscountType] = useState(
    voucher.discountType || "CASH",
  );
  const [amountInput, setAmountInput] = useState(
    voucher.amount?.toString() || "0",
  );
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(
    voucher.expiryDate ? new Date(voucher.expiryDate) : undefined,
  );

  useEffect(() => {
    setCurrentDiscountType(voucher.discountType || "CASH");
    setAmountInput(voucher.amount?.toString() || "0");
    setExpiryDate(
      voucher.expiryDate ? new Date(voucher.expiryDate) : undefined,
    );
  }, [voucher.discountType, voucher.amount, voucher.expiryDate]);
  const handleDiscountTypeChange = (value: "PERCENT" | "CASH") => {
    setCurrentDiscountType(value);
    onSelectChange("discountType", value);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmountInput(value);

    // Convert empty string to 0, otherwise parse the number
    const numericValue = value === "" ? 0 : parseInt(value, 10);

    // Create a synthetic event with proper type casting
    const target = {
      name: "amount",
      value: numericValue,
      type: "number",
      checked: false,
      valueAsNumber: numericValue,
    } as unknown as EventTarget & HTMLInputElement;

    const syntheticEvent = {
      target,
      currentTarget: target,
      nativeEvent: new Event("input"),
      bubbles: true,
      cancelable: true,
      defaultPrevented: false,
      eventPhase: 0,
      isTrusted: true,
      preventDefault: () => {},
      stopPropagation: () => {},
      isDefaultPrevented: () => false,
      isPropagationStopped: () => false,
      persist: () => {},
      timeStamp: Date.now(),
      type: "change",
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    onInputChange(syntheticEvent);
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : undefined;
    setExpiryDate(date);

    // Create a synthetic event for the date change
    const syntheticEvent = {
      target: {
        name: "expiryDate",
        value: date || null,
        type: "date",
      },
      currentTarget: {
        name: "expiryDate",
        value: date || null,
        type: "date",
      },
      nativeEvent: new Event("change"),
      bubbles: true,
      cancelable: true,
      defaultPrevented: false,
      eventPhase: 0,
      isTrusted: true,
      preventDefault: () => {},
      stopPropagation: () => {},
      timeStamp: Date.now(),
      type: "change",
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    onInputChange(syntheticEvent);
  };

  // Tambahkan fungsi khusus untuk menghapus tanggal
  const clearExpiryDate = () => {
    setExpiryDate(undefined);
    // Create a synthetic event with proper type casting
    const syntheticEvent = {
      target: {
        name: "expiryDate",
        value: null,
        type: "date",
        checked: false,
      },
      currentTarget: {
        name: "expiryDate",
        value: null,
        type: "date",
      },
      nativeEvent: new Event("input"),
      bubbles: true,
      cancelable: true,
      defaultPrevented: false,
      eventPhase: 0,
      isTrusted: true,
      preventDefault: () => {},
      stopPropagation: () => {},
      isDefaultPrevented: () => false,
      isPropagationStopped: () => false,
      persist: () => {},
      timeStamp: Date.now(),
      type: "change",
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
          <label htmlFor="name" className="mb-2 block text-sm font-medium">
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
          <label htmlFor="type" className="mb-2 block text-sm font-medium">
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
          <label
            htmlFor="discountType"
            className="mb-2 block text-sm font-medium"
          >
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
          <label htmlFor="amount" className="mb-2 block text-sm font-medium">
            {currentDiscountType === "PERCENT"
              ? "Discount Percentage (%)"
              : "Discount Amount (Rp)"}
          </label>
          <div className="relative">
            {currentDiscountType === "CASH" && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                Rp
              </span>
            )}
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
              className={`[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                currentDiscountType === "CASH" ? "pl-8" : ""
              }`}
            />
          </div>
          {currentDiscountType === "PERCENT" && (
            <p className="mt-1 text-sm text-muted-foreground">
              Maximum discount percentage is 100%
            </p>
          )}
        </div>

        <div>
          <label htmlFor="maxClaim" className="mb-2 block text-sm font-medium">
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
            <label
              htmlFor="referralCode"
              className="mb-2 block text-sm font-medium"
            >
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

        <div>
          <label
            htmlFor="expiryDate"
            className="mb-2 block text-sm font-medium"
          >
            Expiry Date (Optional)
          </label>
          <Input
            id="expiryDate"
            name="expiryDate"
            type="date"
            min={new Date().toISOString().split("T")[0]}
            value={expiryDate ? expiryDate.toISOString().split("T")[0] : ""}
            onChange={handleExpiryDateChange}
            className="w-full"
          />
          {expiryDate && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={clearExpiryDate}
              type="button"
            >
              Clear date
            </Button>
          )}
        </div>
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
