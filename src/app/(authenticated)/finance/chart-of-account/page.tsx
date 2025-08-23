"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { columns } from "./columns";
import { api } from "@/trpc/react";
import { useState, useEffect, useMemo } from "react";
import { ChartAccountForm } from "./chart-account-form";
import { DataTable } from "@/app/_components/datatable/data-table";
import type { ChartAccount } from "./schema";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function ChartAccountPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ChartAccount | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: chartAccounts, refetch } = api.chartAccount.getAll.useQuery();

  // Implement client-side pagination
  const paginatedData = useMemo(() => {
    if (!chartAccounts) return [];
    const start = (page - 1) * limit;
    const end = start + limit;
    return chartAccounts.slice(start, end);
  }, [chartAccounts, page, limit]);

  useEffect(() => {
    const handleEdit = (event: CustomEvent<{ id: number }>) => {
      const account = chartAccounts?.find((acc) => acc.id === event.detail.id);
      if (account) {
        setSelectedAccount(account);
        setIsOpen(true);
      }
    };

    window.addEventListener("editChartAccount", handleEdit as EventListener);
    return () => {
      window.removeEventListener(
        "editChartAccount",
        handleEdit as EventListener,
      );
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

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const tableData = {
    items: paginatedData,
    total: chartAccounts?.length || 0,
    page,
    limit,
  };

  return (
    <ProtectedRoute requiredPermissions={["menu:finance-chart-of-account"]}>
      <div className="container mx-auto py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Chart of Accounts</h1>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={tableData}
          onPaginationChange={handlePaginationChange}
        />

        <ChartAccountForm
          open={isOpen}
          onClose={handleClose}
          account={selectedAccount}
        />
      </div>
    </ProtectedRoute>
  );
}
