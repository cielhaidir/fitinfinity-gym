"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/trpc/react";
import { format, subDays } from "date-fns";
import { DollarSign, ShoppingCart, TrendingUp, FileSpreadsheet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from "xlsx-js-style";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

// Rupiah formatting helper
const formatRupiah = (amount: number) =>
  "Rp" + (typeof amount === "number" && !isNaN(amount) ? amount : 0).toLocaleString("id-ID");
  // amount

interface PaymentMethodBreakdown {
  method: string;
  count: number;
  amount: number;
}

interface TopSellingItem {
  name: string;
  revenue: number;
}

interface DailyBreakdown {
  date: string;
  revenue: number;
}

interface MonthlySummary {
  monthName: string;
  revenue: number;
}

interface SalesSummary {
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    averageTransactionValue: number;
    posRevenue: number;
    subscriptionRevenue: number;
  };
  paymentMethodBreakdown: PaymentMethodBreakdown[];
  topSellingItems: TopSellingItem[];
  dailyBreakdown: DailyBreakdown[];
  monthlySummary?: MonthlySummary[];
}

export default function SalesReportPage() {
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [salesId, setSalesId] = useState<string>("all");

  const { data: salesList } = api.salesReport.getSalesList.useQuery();

  const { data: salesReport, isLoading: isLoadingReport } = api.salesReport.getRevenueBySales.useQuery({
    startDate,
    endDate,
    salesId: salesId === "all" ? undefined : salesId,
  });
  console.log(salesReport);

  const exportToExcel = () => {
    if (!salesReport) return;

    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = salesReport.salesSummary.map(s => ({
      "Sales Name": s.salesName,
      "Sales Type": s.salesType,
      "Total Revenue": formatRupiah(s.totalRevenue),
    }));
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Sales Summary");

    // Detailed Subscriptions Sheet
    if (salesReport.subscriptions.length > 0) {
      const subsData = salesReport.subscriptions.map((sub: any) => ({
        "Payment ID": sub.id,
        "Member Name": sub.member?.user?.name || "N/A",
        "Package": sub.package?.name || "N/A",
        "Amount": formatRupiah(sub.payment.totalPayment),
        "Payment Method": sub.paymentMethod || "N/A",
        "Created At": format(new Date(sub.createdAt), "yyyy-MM-dd HH:mm"),
      }));
      const subsWs = XLSX.utils.json_to_sheet(subsData);
      XLSX.utils.book_append_sheet(wb, subsWs, "Subscription Details");
    }

    XLSX.writeFile(wb, `revenue-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  if (isLoadingReport || !salesReport) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Commission Report</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { summary, salesSummary, subscriptions } = salesReport;

  return (
    <ProtectedRoute requiredPermissions={["report:commission"]}>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Commission Report</h1>
          <Button onClick={exportToExcel} variant="outline" className="bg-green-600 hover:bg-green-700 text-white">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={format(startDate, "yyyy-MM-dd")}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={format(endDate, "yyyy-MM-dd")}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                />
              </div>
              <div>
                <Label>Select Sales</Label>
                <Select value={salesId} onValueChange={setSalesId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sales</SelectItem>
                    {salesList?.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(summary.totalRevenue)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalSubscriptions}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {salesSummary.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="p-2">Sales Name</th>
                  <th className="p-2">Sales Type</th>
                  <th className="p-2">Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {salesSummary.map(s => (
                  <tr key={s.salesId}>
                    <td className="p-2">{s.salesName}</td>
                    <td className="p-2">{s.salesType}</td>
                    <td className="p-2">{formatRupiah(s.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Sales Detail Table */}
        {salesId !== 'all' && (
          <Card>
            <CardHeader>
              <CardTitle>Sales Detail</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="text-left">
                    {/* <th className="p-2">Payment ID</th> */}
                    <th className="p-2">Member Name</th>
                    <th className="p-2">Package</th>
                    <th className="p-2">Amount</th>
                    {/* <th className="p-2">Payment Method</th> */}
                    {/* <th className="p-2">Created At</th> */}
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub: any) => (
                    <tr key={sub.id}>
                      {/* <td className="p-2">{sub.id}</td> */}
                      <td className="p-2">{sub.member?.user?.name || "N/A"}</td>
                      <td className="p-2">{sub.package?.name || "N/A"}</td>
                      <td className="p-2">{formatRupiah(sub.payments?.[0]?.totalPayment ?? 0)}</td>
                      {/* <td className="p-2">{sub.paymentMethod || "N/A"}</td> */}
                      {/* <td className="p-2">{format(new Date(sub.createdAt), "yyyy-MM-dd HH:mm")}</td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}