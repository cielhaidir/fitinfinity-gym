"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { Receipt, Users, Package, TrendingUp, TrendingDown, ShoppingCart, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";

export default function FinanceDashboardPage() {
  const { data: session } = useSession();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  // Date filtering state
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to last 30 days
    return format(date, "yyyy-MM-dd");
  });
  
  const [endDate, setEndDate] = useState<string>(() => {
    return format(new Date(), "yyyy-MM-dd");
  });

  // Convert string dates to Date objects for API calls
  const startDateObj = startDate ? new Date(startDate + "T00:00:00") : undefined;
  const endDateObj = endDate ? new Date(endDate + "T23:59:59") : undefined;

  // Query for finance metrics with date filtering
  const { data: financeMetrics, isLoading: isLoadingMetrics } =
    api.finance.getFinanceMetrics.useQuery(
      { 
        startDate: startDateObj,
        endDate: endDateObj,
      },
      {
        enabled: !!session,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        staleTime: 0,
      },
    );

  // Query for transaction data (existing functionality)
  const { data: transactions, isLoading } =
    api.paymentValidation.listAll.useQuery(
      { page, limit },
      {
        enabled: !!session,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        staleTime: 0,
      },
    );

  const openImageModal = (imageUrl: string) => {
    if (!imageUrl) {
      return;
    }
    setSelectedImageUrl(imageUrl);
    setIsImageModalOpen(true);
  };

  const columns = createColumns({
    onViewProof: openImageModal,
  });

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container mx-auto min-h-screen bg-background p-4 md:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Finance Dashboard
          </h2>
          <p className="text-muted-foreground">
            Overview of financial metrics and recent transactions
          </p>
        </div>
      </div>

      {/* Date Filter Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              onClick={() => {
                // Reset to last 30 days
                const date = new Date();
                date.setDate(date.getDate() - 30);
                setStartDate(format(date, "yyyy-MM-dd"));
                setEndDate(format(new Date(), "yyyy-MM-dd"));
              }}
              variant="outline"
            >
              Reset to Last 30 Days
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Showing data from {format(new Date(startDate), "PPP")} to {format(new Date(endDate), "PPP")}
          </p>
        </CardContent>
      </Card>

      {/* Finance Metrics Cards Section */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        {/* Total Membership Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Membership Sales
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoadingMetrics ? "Loading..." : formatCurrency(financeMetrics?.membershipSales.total ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {financeMetrics?.membershipSales.count ?? 0} transactions
            </p>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isLoadingMetrics ? "Loading..." : formatCurrency(financeMetrics?.expenses.total ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {financeMetrics?.expenses.count ?? 0} transactions
            </p>
          </CardContent>
        </Card>

        {/* Total POS Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              POS Sales
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isLoadingMetrics ? "Loading..." : formatCurrency(financeMetrics?.posSales.total ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {financeMetrics?.posSales.count ?? 0} sales
            </p>
          </CardContent>
        </Card>

        {/* Net Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Net Revenue
            </CardTitle>
            <Receipt className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {isLoadingMetrics ? "Loading..." : formatCurrency(
                (financeMetrics?.membershipSales.total ?? 0) + 
                (financeMetrics?.posSales.total ?? 0) - 
                (financeMetrics?.expenses.total ?? 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue minus expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Original Cards Section (for backward compatibility) */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              All time transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Members
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(transactions?.items.map((t) => t.member?.user?.email))
                .size ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Members with transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Packages
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(transactions?.items.map((t) => t.package?.name)).size ??
                0}
            </div>
            <p className="text-xs text-muted-foreground">
              Different package types sold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions Table */}
      <div className="rounded-md border">
        <DataTable
          columns={columns}
          data={transactions ?? { items: [], total: 0, page: 1, limit: 10 }}
          searchColumns={[
            { id: "member.user.name", placeholder: "Search by member name..." },
            { id: "package.name", placeholder: "Search by package..." },
          ]}
          isLoading={isLoading}
          onPaginationChange={handlePaginationChange}
        />
      </div>

      {/* Image Preview Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
            <DialogDescription>
              Review the uploaded payment proof below.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-center">
            {selectedImageUrl ? (
              <Link
                href={selectedImageUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src={selectedImageUrl}
                  alt="Payment Proof"
                  width={500}
                  height={700}
                  style={{ objectFit: "contain", maxHeight: "70vh" }}
                  onError={(e) => {
                    console.error("Error loading image:", e);
                    (e.target as HTMLImageElement).src =
                      "/placeholder-error.png";
                    (e.target as HTMLImageElement).alt = "Error loading image";
                  }}
                />
              </Link>
            ) : (
              <p>No image to display or image URL is invalid.</p>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsImageModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
