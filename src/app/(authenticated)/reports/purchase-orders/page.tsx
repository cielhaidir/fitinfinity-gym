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
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { type DateRange } from "react-day-picker";
import {
  FileText,
  DollarSign,
  Calculator,
  Truck,
  Download,
  PieChart,
  ShoppingCart,
  Clock,
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

// Status badge colors
const getStatusBadge = (status: string) => {
  const statusConfig: Record<
    string,
    { variant: "default" | "secondary" | "destructive" | "outline"; className: string }
  > = {
    DRAFT: { variant: "secondary", className: "bg-gray-100 text-gray-800" },
    PENDING: { variant: "outline", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
    ORDERED: { variant: "default", className: "bg-blue-100 text-blue-800" },
    PARTIALLY_RECEIVED: { variant: "outline", className: "bg-orange-100 text-orange-800 border-orange-300" },
    RECEIVED: { variant: "default", className: "bg-green-100 text-green-800" },
    CANCELLED: { variant: "destructive", className: "bg-red-100 text-red-800" },
  };

  const config = statusConfig[status] ?? { variant: "secondary" as const, className: "" };

  return (
    <Badge variant={config.variant} className={config.className}>
      {status.replace(/_/g, " ")}
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
  variant?: "default" | "success" | "warning" | "info";
  isLoading: boolean;
}) {
  const variantStyles = {
    default: "text-foreground",
    success: "text-green-600",
    warning: "text-yellow-600",
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
export default function PurchaseOrderReportPage() {
  // Default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Query for PO report data
  const { data: reportData, isLoading } = api.purchaseOrder.getReportData.useQuery(
    {
      startDate: dateRange?.from,
      endDate: dateRange?.to,
    }
  );

  // Handle export
  const handleExportSupplierPerformance = () => {
    if (!reportData?.supplierPerformance) return;
    exportToCSV(
      reportData.supplierPerformance.map((s) => ({
        Supplier: s.supplierName,
        "Total POs": s.totalPOs,
        "Total Value": s.totalValue,
        "Avg Delivery Days": s.averageDeliveryDays ?? "N/A",
        "Completed POs": s.completedPOs,
      })),
      "supplier-performance-report"
    );
  };

  const handleExportTopItems = () => {
    if (!reportData?.topItems) return;
    exportToCSV(
      reportData.topItems.map((item) => ({
        "Item Name": item.itemName,
        "Total Quantity": item.totalQuantity,
        "Total Value": item.totalValue,
      })),
      "top-ordered-items-report"
    );
  };

  // Get status color for chart display
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      DRAFT: "#9CA3AF",
      PENDING: "#F59E0B",
      ORDERED: "#3B82F6",
      PARTIALLY_RECEIVED: "#F97316",
      RECEIVED: "#22C55E",
      CANCELLED: "#EF4444",
    };
    return colors[status] ?? "#6B7280";
  };

  return (
    <ProtectedRoute requiredPermissions={["report:purchase-order"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Purchase Order Report</h1>
            <p className="text-muted-foreground">
              Analyze purchase orders and supplier performance
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportSupplierPerformance} disabled={isLoading}>
              <Download className="mr-2 h-4 w-4" />
              Export Suppliers
            </Button>
            <Button variant="outline" onClick={handleExportTopItems} disabled={isLoading}>
              <Download className="mr-2 h-4 w-4" />
              Export Items
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
              onDateChange={setDateRange}
            />
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            title="Total POs"
            value={reportData?.summary.totalPOs ?? 0}
            icon={FileText}
            description="Purchase orders in period"
            isLoading={isLoading}
          />
          <SummaryCard
            title="Total Value"
            value={formatCurrency(reportData?.summary.totalValue ?? 0)}
            icon={DollarSign}
            variant="success"
            description="Sum of all PO values"
            isLoading={isLoading}
          />
          <SummaryCard
            title="Average PO Value"
            value={formatCurrency(reportData?.summary.averageValue ?? 0)}
            icon={Calculator}
            variant="info"
            description="Per purchase order"
            isLoading={isLoading}
          />
          <SummaryCard
            title="Suppliers"
            value={reportData?.supplierPerformance.length ?? 0}
            icon={Truck}
            description="Active suppliers"
            isLoading={isLoading}
          />
        </div>

        {/* PO Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              PO Status Breakdown
            </CardTitle>
            <CardDescription>
              Distribution of purchase orders by status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex gap-4 flex-wrap">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 w-40" />
                ))}
              </div>
            ) : (
              <div className="flex gap-4 flex-wrap">
                {reportData?.statusBreakdown.map((item) => (
                  <Card key={item.status} className="min-w-[150px]">
                    <CardContent className="pt-4">
                      <div className="mb-2">{getStatusBadge(item.status)}</div>
                      <div className="text-2xl font-bold">{item.count}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.percentage}%
                      </div>
                      {/* Simple progress bar */}
                      <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: getStatusColor(item.status),
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(reportData?.statusBreakdown.length ?? 0) === 0 && (
                  <p className="text-muted-foreground">No purchase orders in this period</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supplier Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Supplier Performance
            </CardTitle>
            <CardDescription>
              Purchase order statistics by supplier
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
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Total POs</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        Avg Delivery (days)
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData?.supplierPerformance.map((supplier) => (
                    <TableRow key={supplier.supplierId}>
                      <TableCell className="font-medium">{supplier.supplierName}</TableCell>
                      <TableCell className="text-right">{supplier.totalPOs}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(supplier.totalValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {supplier.averageDeliveryDays !== null ? (
                          <Badge variant="outline">
                            {supplier.averageDeliveryDays} days
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{supplier.completedPOs}</TableCell>
                    </TableRow>
                  ))}
                  {(reportData?.supplierPerformance.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No supplier data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Items Ordered */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Top Items Ordered
            </CardTitle>
            <CardDescription>
              Most frequently ordered items in this period
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
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Total Quantity</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData?.topItems.map((item, index) => (
                    <TableRow key={item.itemId}>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{item.totalQuantity}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.totalValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(reportData?.topItems.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No items ordered in this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}