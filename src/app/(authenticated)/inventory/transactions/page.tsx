"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { DataTable } from "@/components/datatable/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ArrowDownIcon, ArrowUpIcon, Calendar, Package, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";

// Types
interface InventoryTransaction {
  id: string;
  type: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  note: string | null;
  createdAt: Date;
  item: {
    id: string;
    name: string;
    stock: number;
    category: {
      id: string;
      name: string;
    } | null;
  };
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

// Transaction type config
const transactionTypeConfig: Record<string, { label: string; color: string; icon: typeof ArrowUpIcon }> = {
  SALE: { label: "Sale", color: "destructive", icon: ArrowDownIcon },
  SALE_VOID: { label: "Sale Void", color: "secondary", icon: ArrowUpIcon },
  PURCHASE_RECEIVE: { label: "Purchase", color: "default", icon: ArrowUpIcon },
  ADJUSTMENT_IN: { label: "Adjustment In", color: "default", icon: ArrowUpIcon },
  ADJUSTMENT_OUT: { label: "Adjustment Out", color: "destructive", icon: ArrowDownIcon },
  RETURN: { label: "Return", color: "secondary", icon: ArrowUpIcon },
  TRANSFER_IN: { label: "Transfer In", color: "default", icon: ArrowUpIcon },
  TRANSFER_OUT: { label: "Transfer Out", color: "destructive", icon: ArrowDownIcon },
  INITIAL: { label: "Initial Stock", color: "outline", icon: Package },
};

const transactionTypes = [
  "SALE",
  "SALE_VOID",
  "PURCHASE_RECEIVE",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "RETURN",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "INITIAL",
] as const;

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [itemId, setItemId] = useState<string | undefined>(undefined);
  const [type, setType] = useState<typeof transactionTypes[number] | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const utils = api.useUtils();

  // Queries
  const { data: transactionData, isLoading, refetch } = api.inventory.getTransactions.useQuery({
    page,
    limit,
    itemId,
    type,
    startDate: dateRange?.from,
    endDate: dateRange?.to,
  });

  // Get items for filter dropdown
  const { data: itemsData } = api.inventory.getStockLevels.useQuery({
    page: 1,
    limit: 100,
  });

  // Handlers
  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const handleRefresh = () => {
    refetch();
    utils.inventory.getTransactions.invalidate();
  };

  const clearFilters = () => {
    setItemId(undefined);
    setType(undefined);
    setDateRange(undefined);
    setPage(1);
  };

  // Columns definition
  const columns: ColumnDef<InventoryTransaction>[] = [
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {format(new Date(row.original.createdAt), "MMM d, yyyy")}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(row.original.createdAt), "HH:mm:ss")}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "item",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.item.name}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.item.category?.name ?? "Uncategorized"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => {
        const config = transactionTypeConfig[row.original.type] ?? {
          label: row.original.type,
          color: "secondary",
          icon: Package,
        };
        const Icon = config.icon;

        return (
          <Badge variant={config.color as "default" | "destructive" | "secondary" | "outline"}>
            <Icon className="mr-1 h-3 w-3" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Quantity" />,
      cell: ({ row }) => {
        const qty = row.original.quantity;
        const isPositive = qty > 0;

        return (
          <span className={`font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
            {isPositive ? "+" : ""}
            {qty}
          </span>
        );
      },
    },
    {
      id: "stockChange",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Stock Change" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">{row.original.quantityBefore}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-medium">{row.original.quantityAfter}</span>
        </div>
      ),
    },
    {
      accessorKey: "user",
      header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.user?.name ?? row.original.user?.email ?? "System"}
        </span>
      ),
    },
    {
      accessorKey: "reason",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reason/Reference" />,
      cell: ({ row }) => (
        <div className="flex flex-col max-w-[200px]">
          {row.original.reason && (
            <span className="truncate">{row.original.reason}</span>
          )}
          {row.original.referenceType && (
            <span className="text-xs text-muted-foreground">
              {row.original.referenceType}
              {row.original.referenceId && `: ${row.original.referenceId.substring(0, 8)}...`}
            </span>
          )}
          {row.original.note && (
            <span className="text-xs text-muted-foreground truncate">{row.original.note}</span>
          )}
        </div>
      ),
    },
  ];

  // Prepare table data
  const tableData = {
    items: transactionData?.data ?? [],
    total: transactionData?.total ?? 0,
    page: transactionData?.page ?? 1,
    limit: limit,
  };

  // Calculate summary stats
  const summary = transactionData?.data.reduce(
    (acc, tx) => {
      if (tx.quantity > 0) {
        acc.totalIn += tx.quantity;
        acc.inCount++;
      } else {
        acc.totalOut += Math.abs(tx.quantity);
        acc.outCount++;
      }
      return acc;
    },
    { totalIn: 0, totalOut: 0, inCount: 0, outCount: 0 }
  ) ?? { totalIn: 0, totalOut: 0, inCount: 0, outCount: 0 };

  return (
      <ProtectedRoute requiredPermissions={["menu:inventory"]}>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{transactionData?.total ?? 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock In</CardTitle>
              <ArrowUpIcon className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-600">+{summary.totalIn}</span>
                  <span className="text-sm text-muted-foreground">
                    ({summary.inCount} transactions)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Out</CardTitle>
              <ArrowDownIcon className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-red-600">-{summary.totalOut}</span>
                  <span className="text-sm text-muted-foreground">
                    ({summary.outCount} transactions)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Change</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div
                  className={`text-2xl font-bold ${
                    summary.totalIn - summary.totalOut >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {summary.totalIn - summary.totalOut >= 0 ? "+" : ""}
                  {summary.totalIn - summary.totalOut}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Item</span>
            <Select
              value={itemId ?? "all"}
              onValueChange={(value) => {
                setItemId(value === "all" ? undefined : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                {itemsData?.data.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Type</span>
            <Select
              value={type ?? "all"}
              onValueChange={(value) => {
                setType(value === "all" ? undefined : value as typeof transactionTypes[number]);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {transactionTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {transactionTypeConfig[t]?.label ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Date Range</span>
            <DateRangePicker
              date={dateRange}
              onDateChange={(range) => {
                setDateRange(range);
                setPage(1);
              }}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={tableData}
          onPaginationChange={handlePaginationChange}
          isLoading={isLoading}
        />
      </div>
    </ProtectedRoute>
  );
}