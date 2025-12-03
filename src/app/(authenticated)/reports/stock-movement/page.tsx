"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { type DateRange } from "react-day-picker";
import {
  ArrowUpDown,
  ArrowUpIcon,
  ArrowDownIcon,
  Download,
  TrendingUp,
  TrendingDown,
  Activity,
  Hash,
} from "lucide-react";
import { format, subDays } from "date-fns";

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

// Export to CSV function
const exportToCSV = (data: Array<Record<string, unknown>>, filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0] as object);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Transaction type badge
const getTypeBadge = (type: string) => {
  const typeConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
    SALE: { variant: "destructive", className: "bg-red-100 text-red-800" },
    SALE_VOID: { variant: "outline", className: "bg-gray-100 text-gray-800" },
    PURCHASE_RECEIVE: { variant: "default", className: "bg-green-100 text-green-800" },
    ADJUSTMENT_IN: { variant: "default", className: "bg-blue-100 text-blue-800" },
    ADJUSTMENT_OUT: { variant: "destructive", className: "bg-orange-100 text-orange-800" },
    RETURN: { variant: "outline", className: "bg-purple-100 text-purple-800" },
    TRANSFER_IN: { variant: "default", className: "bg-cyan-100 text-cyan-800" },
    TRANSFER_OUT: { variant: "destructive", className: "bg-pink-100 text-pink-800" },
    INITIAL: { variant: "secondary", className: "bg-gray-100 text-gray-800" },
  };

  const config = typeConfig[type] ?? { variant: "secondary" as const, className: "" };

  return (
    <Badge variant={config.variant} className={config.className}>
      {type.replace(/_/g, " ")}
    </Badge>
  );
};

// Summary Card Component
function SummaryCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
  isLoading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  variant?: "default" | "success" | "danger" | "info";
  isLoading: boolean;
}) {
  const variantStyles = {
    default: "text-foreground",
    success: "text-green-600",
    danger: "text-red-600",
    info: "text-blue-600",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${variantStyles[variant]}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className={`text-2xl font-bold ${variantStyles[variant]}`}>
              {value}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Main Page Component
export default function StockMovementReportPage() {
  // Default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [page, setPage] = useState(1);
  const limit = 20;

  // Query for movement report
  const { data: reportData, isLoading } = api.inventory.getMovementReport.useQuery(
    {
      startDate: dateRange?.from ?? subDays(new Date(), 30),
      endDate: dateRange?.to ?? new Date(),
    },
    {
      enabled: !!dateRange?.from && !!dateRange?.to,
    }
  );

  // Paginate transactions
  const paginatedTransactions = reportData?.transactions.slice(
    (page - 1) * limit,
    page * limit
  ) ?? [];
  const totalPages = Math.ceil((reportData?.transactions.length ?? 0) / limit);

  // Handle export
  const handleExportMovementByItem = () => {
    if (!reportData?.summaryByItem) return;
    exportToCSV(
      reportData.summaryByItem.map((item) => ({
        "Item Name": item.itemName,
        Category: item.categoryName,
        "Total In": item.totalIn,
        "Total Out": item.totalOut,
        "Net Change": item.netChange,
      })),
      "stock-movement-by-item"
    );
  };

  const handleExportTransactions = () => {
    if (!reportData?.transactions) return;
    exportToCSV(
      reportData.transactions.map((tx) => ({
        Date: format(new Date(tx.createdAt), "yyyy-MM-dd HH:mm"),
        "Item Name": tx.item.name,
        Type: tx.type,
        Quantity: tx.quantity,
        "Quantity Before": tx.quantityBefore,
        "Quantity After": tx.quantityAfter,
        Reason: tx.reason ?? "",
        Note: tx.note ?? "",
      })),
      "stock-movement-transactions"
    );
  };

  return (
    <ProtectedRoute requiredPermissions={["report:stock-movement"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Stock Movement Report</h1>
            <p className="text-muted-foreground">
              Track inventory movements and transactions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportMovementByItem} disabled={isLoading}>
              <Download className="mr-2 h-4 w-4" />
              Export by Item
            </Button>
            <Button variant="outline" onClick={handleExportTransactions} disabled={isLoading}>
              <Download className="mr-2 h-4 w-4" />
              Export Transactions
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <DateRangePicker
              date={dateRange}
              onDateChange={(range) => {
                setDateRange(range);
                setPage(1);
              }}
            />
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            title="Total Movements"
            value={reportData?.totalTransactions ?? 0}
            icon={Activity}
            description="Transactions in period"
            isLoading={isLoading}
          />
          <SummaryCard
            title="Total Stock In"
            value={reportData?.overallTotalIn ?? 0}
            icon={TrendingUp}
            variant="success"
            description="Items received"
            isLoading={isLoading}
          />
          <SummaryCard
            title="Total Stock Out"
            value={reportData?.overallTotalOut ?? 0}
            icon={TrendingDown}
            variant="danger"
            description="Items dispatched"
            isLoading={isLoading}
          />
          <SummaryCard
            title="Net Change"
            value={
              (reportData?.netChange ?? 0) > 0
                ? `+${reportData?.netChange}`
                : reportData?.netChange ?? 0
            }
            icon={ArrowUpDown}
            variant={
              (reportData?.netChange ?? 0) > 0
                ? "success"
                : (reportData?.netChange ?? 0) < 0
                ? "danger"
                : "default"
            }
            description="Overall stock change"
            isLoading={isLoading}
          />
        </div>

        {/* Movement by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Movement by Type
            </CardTitle>
            <CardDescription>
              Breakdown of transactions by type
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex gap-4 flex-wrap">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 w-40" />
                ))}
              </div>
            ) : (
              <div className="flex gap-4 flex-wrap">
                {Object.entries(reportData?.summaryByType ?? {}).map(([type, data]) => (
                  <Card key={type} className="min-w-[150px]">
                    <CardContent className="pt-4">
                      <div className="mb-2">{getTypeBadge(type)}</div>
                      <div className="text-2xl font-bold">{data.count}</div>
                      <div className="text-sm text-muted-foreground">
                        {data.totalQuantity} units
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {Object.keys(reportData?.summaryByType ?? {}).length === 0 && (
                  <p className="text-muted-foreground">No movements in this period</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Movement by Item */}
        <Card>
          <CardHeader>
            <CardTitle>Movement by Item</CardTitle>
            <CardDescription>
              Stock changes per item in the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ArrowUpIcon className="h-3 w-3 text-green-600" />
                        Total In
                      </div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ArrowDownIcon className="h-3 w-3 text-red-600" />
                        Total Out
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Net Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData?.summaryByItem.map((item) => (
                    <TableRow key={item.itemId}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.categoryName}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        +{item.totalIn}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -{item.totalOut}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            item.netChange > 0
                              ? "text-green-600"
                              : item.netChange < 0
                              ? "text-red-600"
                              : ""
                          }
                        >
                          {item.netChange > 0 ? "+" : ""}
                          {item.netChange}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(reportData?.summaryByItem.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No movements in this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Detailed Transaction Log */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Log</CardTitle>
            <CardDescription>
              Detailed list of all transactions in the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Before</TableHead>
                      <TableHead className="text-right">After</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(tx.createdAt), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium">{tx.item.name}</TableCell>
                        <TableCell>{getTypeBadge(tx.type)}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              tx.quantity > 0 ? "text-green-600" : "text-red-600"
                            }
                          >
                            {tx.quantity > 0 ? "+" : ""}
                            {tx.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {tx.quantityBefore}
                        </TableCell>
                        <TableCell className="text-right">{tx.quantityAfter}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {tx.reason ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No transactions in this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {(page - 1) * limit + 1} to{" "}
                      {Math.min(page * limit, reportData?.transactions.length ?? 0)} of{" "}
                      {reportData?.transactions.length ?? 0} transactions
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}