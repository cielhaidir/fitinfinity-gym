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
  Package,
  AlertTriangle,
  PackageX,
  DollarSign,
  Download,
  BarChart3,
} from "lucide-react";

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
          // Handle strings with commas or quotes
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
  variant?: "default" | "warning" | "danger" | "success";
  isLoading: boolean;
}) {
  const variantStyles = {
    default: "text-foreground",
    warning: "text-yellow-600",
    danger: "text-red-600",
    success: "text-green-600",
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
export default function InventoryReportPage() {
  const [sortField, setSortField] = useState<"shortage" | "stock" | "name">("shortage");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Query for stock report
  const { data: reportData, isLoading } = api.inventory.getStockReport.useQuery();

  // Sort low stock items
  const sortedLowStockItems = [...(reportData?.lowStockItems ?? [])].sort((a, b) => {
    if (sortField === "shortage") {
      return sortOrder === "desc" ? b.shortage - a.shortage : a.shortage - b.shortage;
    }
    if (sortField === "stock") {
      return sortOrder === "desc" ? b.stock - a.stock : a.stock - b.stock;
    }
    return sortOrder === "desc"
      ? b.name.localeCompare(a.name)
      : a.name.localeCompare(b.name);
  });

  // Handle sort
  const handleSort = (field: "shortage" | "stock" | "name") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Handle export
  const handleExportLowStock = () => {
    if (!reportData?.lowStockItems) return;
    exportToCSV(
      reportData.lowStockItems.map((item) => ({
        "Item Name": item.name,
        Category: item.categoryName,
        "Current Stock": item.stock,
        "Min Stock": item.minStock,
        Shortage: item.shortage,
      })),
      "low-stock-report"
    );
  };

  const handleExportByCategory = () => {
    if (!reportData?.byCategory) return;
    exportToCSV(
      reportData.byCategory.map((cat) => ({
        Category: cat.name,
        "Items Count": cat.itemCount,
        "Total Stock": cat.totalStock,
        "Total Value": cat.totalValue,
      })),
      "stock-by-category-report"
    );
  };

  return (
    <ProtectedRoute requiredPermissions={["report:inventory"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventory Report</h1>
            <p className="text-muted-foreground">
              Stock overview and low stock alerts
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportByCategory} disabled={isLoading}>
              <Download className="mr-2 h-4 w-4" />
              Export by Category
            </Button>
            <Button variant="outline" onClick={handleExportLowStock} disabled={isLoading}>
              <Download className="mr-2 h-4 w-4" />
              Export Low Stock
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            title="Total Items"
            value={reportData?.summary.totalItems ?? 0}
            icon={Package}
            description="Active inventory items"
            isLoading={isLoading}
          />
          <SummaryCard
            title="Total Stock Value"
            value={formatCurrency(reportData?.summary.totalStockValue ?? 0)}
            icon={DollarSign}
            description="Based on selling price"
            isLoading={isLoading}
          />
          <SummaryCard
            title="Low Stock Items"
            value={reportData?.summary.lowStockCount ?? 0}
            icon={AlertTriangle}
            variant="warning"
            description="Items below minimum stock"
            isLoading={isLoading}
          />
          <SummaryCard
            title="Out of Stock"
            value={reportData?.summary.outOfStockCount ?? 0}
            icon={PackageX}
            variant="danger"
            description="Items with zero stock"
            isLoading={isLoading}
          />
        </div>

        {/* Stock by Category */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Stock by Category
                </CardTitle>
                <CardDescription>
                  Inventory breakdown by product category
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Items Count</TableHead>
                    <TableHead className="text-right">Total Stock</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData?.byCategory.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-right">{category.itemCount}</TableCell>
                      <TableCell className="text-right">{category.totalStock}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(category.totalValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {reportData?.byCategory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Low Stock Items
                </CardTitle>
                <CardDescription>
                  Items that need to be restocked soon
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                {reportData?.lowStockItems.length ?? 0} items
              </Badge>
            </div>
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
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("name")}
                    >
                      Item Name
                      {sortField === "name" && (
                        <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead
                      className="text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("stock")}
                    >
                      Current Stock
                      {sortField === "stock" && (
                        <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </TableHead>
                    <TableHead className="text-right">Min Stock</TableHead>
                    <TableHead
                      className="text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("shortage")}
                    >
                      Shortage
                      {sortField === "shortage" && (
                        <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLowStockItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.stock === 0 && (
                            <PackageX className="h-4 w-4 text-red-500" />
                          )}
                          {item.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.categoryName}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            item.stock === 0 ? "text-red-600 font-medium" : ""
                          }
                        >
                          {item.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{item.minStock}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{item.shortage}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedLowStockItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No low stock items
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