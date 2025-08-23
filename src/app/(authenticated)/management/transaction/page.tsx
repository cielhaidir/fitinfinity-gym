"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/datatable/data-table";
import { transactionColumns } from "./columns";
import { api } from "@/trpc/react";
import { type Transaction } from "./schema";
import { TransactionForm } from "./transaction-form";
import { toast } from "sonner";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function TransactionPage() {
  const utils = api.useUtils();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [newTransaction, setNewTransaction] = useState<Transaction>({
    bank_id: 0,
    account_id: 0,
    type: "",
    file: "",
    description: "",
    transaction_date: new Date(),
    amount: 0,
  });
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const {
    data: transactions = { items: [], total: 0, page: 1, limit: 10 },
    isLoading,
  } = api.transaction.list.useQuery({
    page,
    limit,
    search,
    searchColumn,
  });

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const createTransactionMutation = api.transaction.create.useMutation();
  const updateTransactionMutation = api.transaction.update.useMutation();
  const deleteTransactionMutation = api.transaction.remove.useMutation();

  const handleInputChange = (name: string, value: any) => {
    if (name === "isModalOpen") {
      setIsModalOpen(value);
      if (!value) {
        resetForm();
      }
      return;
    }

    if (isEditMode && selectedTransaction) {
      setSelectedTransaction((prev) => ({
        ...prev!,
        [name]: value,
      }));
    } else {
      setNewTransaction((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const resetForm = () => {
    setIsEditMode(false);
    setSelectedTransaction(null);
    setNewTransaction({
      bank_id: 0,
      account_id: 0,
      type: "",
      file: "",
      description: "",
      transaction_date: new Date(),
      amount: 0,
    });
  };

  const handleCreateOrUpdateTransaction = async () => {
    try {
      const promise = async () => {
        if (isEditMode && selectedTransaction) {
          await updateTransactionMutation.mutateAsync({
            id: selectedTransaction.id!,
            bank_id: selectedTransaction.bank_id,
            account_id: selectedTransaction.account_id,
            type: selectedTransaction.type,
            file: selectedTransaction.file,
            description: selectedTransaction.description,
            transaction_date: selectedTransaction.transaction_date,
            amount: selectedTransaction.amount,
            closed_at: selectedTransaction.closed_at,
          });
        } else {
          await createTransactionMutation.mutateAsync({
            bank_id: newTransaction.bank_id,
            account_id: newTransaction.account_id,
            type: newTransaction.type,
            file: newTransaction.file,
            description: newTransaction.description,
            transaction_date: newTransaction.transaction_date,
            amount: newTransaction.amount,
          });
        }

        await utils.transaction.list.invalidate();
        setIsModalOpen(false);
        setIsEditMode(false);
        setSelectedTransaction(null);
        setNewTransaction({
          bank_id: 0,
          account_id: 0,
          type: "",
          file: "",
          description: "",
          transaction_date: new Date(),
          amount: 0,
        });
      };

      await toast.promise(promise(), {
        loading: "Loading...",
        success: isEditMode
          ? "Transaction updated successfully!"
          : "Transaction created successfully!",
        error: (error) =>
          error instanceof Error ? error.message : String(error),
      });
    } catch (error) {
      console.error("Error handling transaction:", error);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (!transaction.id) return;

    try {
      const promise = deleteTransactionMutation.mutateAsync({
        id: transaction.id,
      });

      await toast.promise(promise, {
        loading: "Deleting transaction...",
        success: "Transaction deleted successfully!",
        error: (error) =>
          error instanceof Error ? error.message : String(error),
      });

      await utils.transaction.list.invalidate();
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  const columns = transactionColumns({
    onEdit: handleEditTransaction,
    onDelete: handleDeleteTransaction,
  });

  return (
    <ProtectedRoute requiredPermissions={["menu:transaction"]}>
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setIsEditMode(false);
            setSelectedTransaction(null);
            setNewTransaction({
              bank_id: 0,
              account_id: 0,
              type: "",
              file: "",
              description: "",
              transaction_date: new Date(),
              amount: 0,
            });
          }
        }}
      >
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
          <div className="flex items-center justify-between space-y-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Transaction Management
              </h2>
              <p className="text-muted-foreground">
                Manage financial transactions here
              </p>
            </div>
            <DialogTrigger asChild>
              <Button className="mb-4 bg-infinity">
                <Plus className="mr-2 h-4 w-4" /> Add Transaction
              </Button>
            </DialogTrigger>
          </div>
          <DataTable
            columns={columns}
            data={transactions}
            onPaginationChange={handlePaginationChange}
            searchColumns={[
              {
                id: "transaction_number",
                placeholder: "Search by transaction number...",
              },
              { id: "description", placeholder: "Search by description..." },
            ]}
            onSearch={(value, column) => {
              setSearch(value);
              setSearchColumn(column);
            }}
            isLoading={isLoading}
          />
        </div>
        <TransactionForm
          transaction={selectedTransaction || newTransaction}
          onSubmit={handleCreateOrUpdateTransaction}
          onInputChange={handleInputChange}
          isEditMode={isEditMode}
        />
      </Dialog>
    </>
  );
}
