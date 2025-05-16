"use client";

import { useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/trpc/react";
import { Transaction } from "./schema";
import { format } from "date-fns";

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

    const { data: bankAccounts = [] } = api.balanceAccount.getAll.useQuery({
        page: 1,
        limit: 100,
    });

    const { data: chartAccounts = [] } = api.chartAccount.list.useQuery({
        page: 1,
        limit: 100,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        onInputChange(name, value);
    };

    const handleSelectChange = (name: string, value: any) => {
        onInputChange(name, value);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            // For simplicity, just storing the file name
            // In a real app, you'd upload the file and store the file URL or ID
            // onInputChange("file", file.name);
        }
    };

    return (
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
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
                    <Input
                        id="type"
                        name="type"
                        placeholder="Transaction Type"
                        value={transaction.type || ""}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="bank_id" className="block text-sm font-medium">
                        Bank Account
                    </label>
                    <Select
                        value={transaction.bank_id?.toString() || ""}
                        onValueChange={(value) => handleSelectChange("bank_id", parseInt(value))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a bank account" />
                        </SelectTrigger>
                        <SelectContent>
                            {(Array.isArray(bankAccounts) ? bankAccounts : bankAccounts.items)?.map((bank) => (
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
                        onValueChange={(value) => handleSelectChange("account_id", parseInt(value))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a chart account" />
                        </SelectTrigger>
                        <SelectContent>
                            {(Array.isArray(chartAccounts) ? chartAccounts : chartAccounts.items)?.map((account) => (
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
                        type="number"
                        placeholder="Amount"
                        value={transaction.amount || ""}
                        onChange={(e) => handleSelectChange("amount", parseFloat(e.target.value))}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="transaction_date" className="block text-sm font-medium">
                        Transaction Date
                    </label>
                    <Input
                        id="transaction_date"
                        name="transaction_date"
                        type="date"
                        value={transaction.transaction_date 
                            ? format(new Date(transaction.transaction_date), "yyyy-MM-dd")
                            : ""}
                        onChange={(e) => onInputChange("transaction_date", new Date(e.target.value))}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="file" className="block text-sm font-medium">
                        File Upload
                    </label>
                    <div className="flex gap-2 items-center">
                        <Input
                            ref={fileInputRef}
                            id="file"
                            name="file"
                            type="file"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Choose File
                        </Button>
                        <span className="text-sm truncate max-w-[300px]">
                            {transaction.file ? transaction.file : "No file chosen"}
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
                <Button onClick={onSubmit} className="bg-infinity">
                    {isEditMode ? "Update Transaction" : "Create Transaction"}
                </Button>
                <Button variant="outline" onClick={() => onInputChange("isModalOpen", false)}>
                    Cancel
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};