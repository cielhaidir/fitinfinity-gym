"use client";

import { useRef, useState, useEffect } from "react";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";
import { type Transaction } from "./schema";
import { format } from "date-fns";
import { toast } from "sonner";

type TransactionFormProps = {
  transaction: Transaction;
  onInputChange: (name: string, value: any) => void;
  onSubmit: () => void;
  isEditMode: boolean;
};

export const TransactionForm: React.FC<TransactionFormProps> = ({
  transaction,
  onInputChange,
  onSubmit,
  isEditMode,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [amount, setAmount] = useState("");

  const { data: bankAccounts = [] } = api.balanceAccount.getAll.useQuery({
    page: 1,
    limit: 100,
  });

  const { data: chartAccounts = [] } = api.chartAccount.list.useQuery({
    page: 1,
    limit: 100,
  });

  const uploadFileMutation = api.transaction.uploadFile.useMutation();

  const formatRupiah = (value: string) => {
    // Remove all non-digit characters
    const number = value.replace(/\D/g, "");

    // If empty, return empty string
    if (!number) return "";

    // Format as Rupiah
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(number));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove currency symbol and formatting
    const cleanValue = value.replace(/[^\d]/g, "");

    // Format the value
    const formattedValue = formatRupiah(cleanValue);
    setAmount(formattedValue);

    // Convert to number for the actual value
    const numericValue = Number(cleanValue);
    onInputChange("amount", numericValue);
  };

  useEffect(() => {
    if (transaction) {
      setAmount(
        transaction.amount ? formatRupiah(transaction.amount.toString()) : "",
      );
    } else {
      setAmount("");
    }
  }, [transaction]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    onInputChange(name, value);
  };

  const handleSelectChange = (name: string, value: any) => {
    onInputChange(name, value);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = async () => {
        const base64Data = reader.result as string;

        // Upload file
        const result = await uploadFileMutation.mutateAsync({
          fileData: base64Data,
          fileName: file.name,
        });

        // Update transaction with file path
        onInputChange("file", result.filePath);
        toast.success("File uploaded successfully");
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const getFileNameFromPath = (path: string) => {
    if (!path) return "";
    // Get the last part of the path after the last slash
    const parts = path.split("/");
    return parts[parts.length - 1];
  };

  return (
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>
          {isEditMode ? "Edit Transaction" : "Create New Transaction"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Edit the transaction details."
            : "Fill in the details to create a new transaction."}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium">
            Type
          </label>
          <Select
            value={transaction.type || ""}
            onValueChange={(value) => handleSelectChange("type", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select transaction type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expenses">Expenses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="bank_id" className="block text-sm font-medium">
            Bank Account
          </label>
          <Select
            value={transaction.bank_id?.toString() || ""}
            onValueChange={(value) =>
              handleSelectChange("bank_id", parseInt(value))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a bank account" />
            </SelectTrigger>
            <SelectContent>
              {(Array.isArray(bankAccounts)
                ? bankAccounts
                : bankAccounts.items
              )?.map((bank) => (
                <SelectItem key={bank.id} value={bank.id.toString()}>
                  {bank.name} - {bank.account_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="account_id" className="block text-sm font-medium">
            Chart Account
          </label>
          <Select
            value={transaction.account_id?.toString() || ""}
            onValueChange={(value) =>
              handleSelectChange("account_id", parseInt(value))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a chart account" />
            </SelectTrigger>
            <SelectContent>
              {(Array.isArray(chartAccounts)
                ? chartAccounts
                : chartAccounts.items
              )?.map((account) => (
                <SelectItem key={account.id} value={account.id.toString()}>
                  {account.reff} - {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium">
            Amount
          </label>
          <Input
            id="amount"
            name="amount"
            placeholder="Rp 0"
            value={amount}
            onChange={handleAmountChange}
            required
          />
        </div>

        <div>
          <label
            htmlFor="transaction_date"
            className="block text-sm font-medium"
          >
            Transaction Date
          </label>
          <Input
            id="transaction_date"
            name="transaction_date"
            type="date"
            value={
              transaction.transaction_date
                ? format(new Date(transaction.transaction_date), "yyyy-MM-dd")
                : ""
            }
            onChange={(e) =>
              onInputChange("transaction_date", new Date(e.target.value))
            }
            required
          />
        </div>

        <div>
          <label htmlFor="file" className="block text-sm font-medium">
            File Upload
          </label>
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              id="file"
              name="file"
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Choose File"}
            </Button>
            <span className="max-w-[300px] truncate text-sm">
              {transaction.file
                ? getFileNameFromPath(transaction.file)
                : "No file chosen"}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Description
          </label>
          <Textarea
            id="description"
            name="description"
            placeholder="Transaction Description"
            value={transaction.description || ""}
            onChange={handleChange}
            rows={3}
            required
          />
        </div>
      </div>
      <DialogFooter className="flex justify-end gap-2">
        <Button
          onClick={onSubmit}
          className="bg-infinity"
          disabled={isUploading}
        >
          {isEditMode ? "Update Transaction" : "Create Transaction"}
        </Button>
        <Button
          variant="outline"
          onClick={() => onInputChange("isModalOpen", false)}
          disabled={isUploading}
        >
          Cancel
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
