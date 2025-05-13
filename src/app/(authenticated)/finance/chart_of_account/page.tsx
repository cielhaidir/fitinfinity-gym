"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { columns } from "./columns";
import { api } from "@/trpc/react";
import { useState } from "react";
import { ChartAccountForm } from "./chart-account-form";
import { DataTable } from "@/app/_components/datatable/data-table";

export default function ChartAccountPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{
    id: number;
    reff: string;
    name: string;
    type: string;
    flow: "income" | "outcome" | "both";
  } | null>(null);

  const { data: chartAccounts, refetch } = api.chartAccount.getAll.useQuery();

  const handleEdit = (id: number) => {
    const account = chartAccounts?.find(acc => acc.id === id);
    if (account) {
      setSelectedAccount(account);
      setIsOpen(true);
    }
  };

  const handleAdd = () => {
    setSelectedAccount(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedAccount(null);
    refetch();
  };

  const tableData = {
    items: chartAccounts || [],
    total: chartAccounts?.length || 0,
    page: 1,
    limit: 10
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Chart of Accounts</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </div>

      <DataTable columns={columns} data={tableData} />

      <ChartAccountForm
        open={isOpen}
        onClose={handleClose}
        account={selectedAccount}
      />
    </div>
  );
}
