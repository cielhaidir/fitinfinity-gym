"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { columns } from "./columns";
import { api } from "@/trpc/react";
import { useState, useEffect } from "react";
import { ChartAccountForm } from "./chart-account-form";
import { DataTable } from "@/app/_components/datatable/data-table";
import type { ChartAccount } from "./schema";

export default function ChartAccountPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ChartAccount | null>(null);

  const { data: chartAccounts, refetch } = api.chartAccount.getAll.useQuery();

  useEffect(() => {
    const handleEdit = (event: CustomEvent<{ id: number }>) => {
      const account = chartAccounts?.find(acc => acc.id === event.detail.id);
      if (account) {
        setSelectedAccount(account);
        setIsOpen(true);
      }
    };

    window.addEventListener("editChartAccount", handleEdit as EventListener);
    return () => {
      window.removeEventListener("editChartAccount", handleEdit as EventListener);
    };
  }, [chartAccounts]);

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
