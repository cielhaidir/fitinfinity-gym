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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface ChartAccountFormProps {
  open: boolean;
  onClose: () => void;
  account: {
    id: number;
    reff: string;
    name: string;
    type: string;
    flow: "income" | "outcome" | "both";
  } | null;
}

export function ChartAccountForm({
  open,
  onClose,
  account,
}: ChartAccountFormProps) {
  const utils = api.useUtils();
  const [reff, setReff] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [flow, setFlow] = useState<"income" | "outcome" | "both">("income");
  const [errors, setErrors] = useState<{ reff?: string; name?: string; type?: string; flow?: string }>({});

  useEffect(() => {
    setReff(account?.reff ?? "");
    setName(account?.name ?? "");
    setType(account?.type ?? "");
    setFlow(account?.flow ?? "income");
    setErrors({});
  }, [account, open]);

  const createAccount = api.chartAccount.create.useMutation({
    onSuccess: () => {
      toast.success("Chart account created successfully");
      utils.chartAccount.getAll.invalidate();
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateAccount = api.chartAccount.update.useMutation({
    onSuccess: () => {
      toast.success("Chart account updated successfully");
      utils.chartAccount.getAll.invalidate();
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setReff("");
    setName("");
    setType("");
    setFlow("income");
  };

  const validate = () => {
    const newErrors: { reff?: string; name?: string; type?: string; flow?: string } = {};
    if (!reff.trim()) newErrors.reff = "Reference is required";
    if (!name.trim()) newErrors.name = "Name is required";
    if (!type.trim()) newErrors.type = "Account type is required";
    if (!flow) newErrors.flow = "Flow type is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (account) {
      updateAccount.mutate({
        id: account.id,
        reff,
        name,
        type,
        flow,
      });
    } else {
      createAccount.mutate({
        reff,
        name,
        type,
        flow,
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {account ? "Edit Chart Account" : "Create New Chart Account"}
          </SheetTitle>
          <SheetDescription>
            {account ? "Edit the chart account details." : "Add a new chart account to the system."}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 py-8 sm:px-0 px-4">
          <div>
            <label className="block text-sm font-medium">Reference</label>
            <Input
              placeholder="Enter reference"
              value={reff}
              onChange={e => setReff(e.target.value)}
            />
            {errors.reff && <p className="text-sm text-red-500 mt-1">{errors.reff}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Name</label>
            <Input
              placeholder="Enter name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Account Type</label>
            <Input
              placeholder="Enter account type"
              value={type}
              onChange={e => setType(e.target.value)}
            />
            {errors.type && <p className="text-sm text-red-500 mt-1">{errors.type}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Flow</label>
            <Select
              value={flow}
              onValueChange={(value: "income" | "outcome" | "both") => setFlow(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select flow type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="outcome">Outcome</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
            {errors.flow && <p className="text-sm text-red-500 mt-1">{errors.flow}</p>}
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