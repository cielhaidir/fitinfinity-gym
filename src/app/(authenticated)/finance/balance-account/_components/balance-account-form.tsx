"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface BalanceAccountFormProps {
  open: boolean;
  onClose: () => void;
  account: {
    id: number;
    name: string;
    account_number: string;
    initialBalance?: number;
  } | null;
}

export function BalanceAccountForm({
  open,
  onClose,
  account,
}: BalanceAccountFormProps) {
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");
  const [errors, setErrors] = useState<{
    name?: string;
    account_number?: string;
    initialBalance?: string;
  }>({});

  useEffect(() => {
    setName(account?.name ?? "");
    setAccountNumber(account?.account_number ?? "");
    setInitialBalance(account?.initialBalance?.toString() ?? "0");
    setErrors({});
  }, [account, open]);

  const createAccount = api.balanceAccount.create.useMutation({
    onSuccess: () => {
      toast.success("Account created successfully");
      utils.balanceAccount.getAll.invalidate();
      onClose();
      setName("");
      setAccountNumber("");
      setInitialBalance("0");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateAccount = api.balanceAccount.update.useMutation({
    onSuccess: () => {
      toast.success("Account updated successfully");
      utils.balanceAccount.getAll.invalidate();
      onClose();
      setName("");
      setAccountNumber("");
      setInitialBalance("0");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const validate = () => {
    const newErrors: {
      name?: string;
      account_number?: string;
      initialBalance?: string;
    } = {};

    if (!name.trim()) newErrors.name = "Name is required";
    if (!accountNumber.trim())
      newErrors.account_number = "Account number is required";

    const balanceValue = parseFloat(initialBalance);
    if (isNaN(balanceValue)) {
      newErrors.initialBalance = "Initial balance must be a valid number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const balanceValue = parseFloat(initialBalance);

    if (account) {
      updateAccount.mutate({
        id: account.id,
        name,
        account_number: accountNumber,
        initialBalance: balanceValue,
      });
    } else {
      createAccount.mutate({
        name,
        account_number: accountNumber,
        initialBalance: balanceValue,
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {account ? "Edit Balance Account" : "Create New Balance Account"}
          </SheetTitle>
          <SheetDescription>
            {account
              ? "Edit the balance account details."
              : "Add a new balance account to the system."}
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 px-4 py-8 sm:px-0"
        >
          <div>
            <label className="block text-sm font-medium">Name</label>
            <Input
              placeholder="Enter account name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">Account Number</label>
            <Input
              placeholder="Enter account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
            {errors.account_number && (
              <p className="mt-1 text-sm text-red-500">
                {errors.account_number}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">Initial Balance</label>
            <Input
              type="number"
              placeholder="Enter initial balance"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
            />
            {errors.initialBalance && (
              <p className="mt-1 text-sm text-red-500">
                {errors.initialBalance}
              </p>
            )}
          </div>
        </form>
        <SheetFooter className="flex justify-end gap-2">
          <Button onClick={onSubmit} className="bg-infinity">
            {account ? "Update Account" : "Create Account"}
          </Button>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
