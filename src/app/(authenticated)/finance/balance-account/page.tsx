"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { api } from "@/trpc/react";
import { type BalanceAccount, BalanceAccountList } from "./schema";
import { BalanceAccountForm } from "./_components/balance-account-form";
import { toast } from "sonner";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function BalanceAccountPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BalanceAccount | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const utils = api.useUtils();
  const { data: accounts = { items: [], total: 0, page: 1, limit: 10 } } =
    api.balanceAccount.getAll.useQuery({
      page,
      limit,
      search,
      searchColumn,
    });

  const createAccount = api.balanceAccount.create.useMutation({
    onSuccess: () => {
      toast.success("Account created successfully");
      utils.balanceAccount.getAll.invalidate();
      setIsSheetOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateAccount = api.balanceAccount.update.useMutation({
    onSuccess: () => {
      toast.success("Account updated successfully");
      utils.balanceAccount.getAll.invalidate();
      setIsSheetOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteAccount = api.balanceAccount.delete.useMutation({
    onSuccess: () => {
      toast.success("Account deleted successfully");
      utils.balanceAccount.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEditAccount = (account: BalanceAccount) => {
    setSelectedAccount(account);
    setIsSheetOpen(true);
  };

  const handleDeleteAccount = async (account: BalanceAccount) => {
    if (window.confirm("Are you sure you want to delete this account?")) {
      await deleteAccount.mutate({ id: account.id });
    }
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const columns = createColumns({
    onEditAccount: handleEditAccount,
    onDeleteAccount: handleDeleteAccount,
  });

  return (
    <ProtectedRoute requiredPermissions={["menu:balances"]}>
      <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Balance Account Management
            </h2>
            <p className="text-muted-foreground">
              Here&apos;s a list of your balance accounts!
            </p>
          </div>
          <Sheet
            open={isSheetOpen}
            onOpenChange={(open) => {
              setIsSheetOpen(open);
              if (!open) {
                setSelectedAccount(null);
              }
            }}
          >
            <SheetTrigger asChild>
              <Button className="mb-4 bg-infinity">
                <Plus className="mr-2 h-4 w-4" /> Create Account
              </Button>
            </SheetTrigger>

            <BalanceAccountForm
              open={isSheetOpen}
              onClose={() => {
                setIsSheetOpen(false);
                setSelectedAccount(null);
              }}
              account={selectedAccount}
            />
          </Sheet>
        </div>

        <DataTable
          data={accounts}
          columns={columns}
          onPaginationChange={handlePaginationChange}
          searchColumns={[
            { id: "name", placeholder: "Search by name..." },
            { id: "account_number", placeholder: "Search by account number..." },
          ]}
          onSearch={(value, column) => {
            setSearch(value);
            setSearchColumn(column);
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
