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
  "Rp" + amount.toLocaleString("id-ID");

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
  const [paymentMethod, setPaymentMethod] = useState<string>("all");
  const [includePos, setIncludePos] = useState(true);
  const [includeSubscriptions, setIncludeSubscriptions] = useState(true);

  // Fetch sales summary
  const { data: salesSummary, isLoading: isLoadingSummary } = api.salesReport.getSalesSummary.useQuery({
    startDate,
    endDate,
    paymentMethod: paymentMethod === "all" ? undefined : paymentMethod,
    includePos,
    includeSubscriptions,
  });

  // Fetch POS sales data for Excel export
  const { data: posSalesData } = api.posSale.export.useQuery(
    {
      dateFrom: startDate,
      dateTo: endDate,
      paymentMethod: paymentMethod === "all" ? undefined : paymentMethod,
    },
    { enabled: includePos }
  );


  
  const { data: subscriptionData } = api.paymentValidation.getActive.useQuery(
    {
      startDate: startDate,
      endDate: endDate,
    }
  );
  
  console.log("Subscription Data:", subscriptionData);
  // Enhanced Excel export with multiple sheets
  const exportToExcel = async () => {
    const workbook = XLSX.utils.book_new();
    
    // Sheet 1: POS Sales
    if (includePos && posSalesData?.data) {
      const posSheetData = posSalesData.data.map((sale: any) => ({
        "Sale Number": sale.saleNumber,
        "Date": format(new Date(sale.saleDate), "yyyy-MM-dd HH:mm:ss"),
        "Cashier": sale.cashier,
        "Payment Method": sale.paymentMethod,
        "Balance Account": sale.balanceAccount,
        "Item Name": sale.itemName,
        "Category": sale.itemCategory,
        "Quantity": sale.quantity,
        "Unit Price": formatRupiah(sale.unitPrice),
        "Item Subtotal": formatRupiah(sale.itemSubtotal),
        "Sale Subtotal": formatRupiah(sale.saleSubtotal),
        "Tax": formatRupiah(sale.tax),
        "Discount": formatRupiah(sale.discount),
        "Total": formatRupiah(sale.saleTotal),
        "Amount Paid": formatRupiah(sale.amountPaid),
        "Change": formatRupiah(sale.change),
        "Notes": sale.notes,
      }));
      
      const posWorksheet = XLSX.utils.json_to_sheet(posSheetData);
      
      // Auto-size columns
      const posCols = Object.keys(posSheetData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      posWorksheet['!cols'] = posCols;
      
      XLSX.utils.book_append_sheet(workbook, posWorksheet, "POS Sales");
    }
    
    // Sheet 2: Subscriptions (only successful ones)
    if (includeSubscriptions ) {




      const subscriptionSheetData = subscriptionData?.map((payment: any) => {
        const subscription = payment.subscription;
        const member = subscription?.member;
        const user = member?.user;
        const fc = member?.fc;
        const trainer = subscription?.trainer;
      
        return {
          "Payment ID": payment.id,
          "Invoice": payment.orderReference || "N/A",
          "Member Name": user?.name || "N/A",
          "Email": user?.email || "N/A",
          "Package": subscription?.package?.name || "N/A",
          "Type": subscription?.package?.type === "GYM_MEMBERSHIP" ? "Gym Membership" : "Personal Trainer",
          "Trainer": trainer?.user?.name || "N/A",
          "Sales Person": fc?.user?.name || "N/A",
          "Amount": payment.totalPayment || 0,
          "Payment Method": payment.method || "Manual Payment",
          "Status": payment.status,
          "Start Date": subscription?.startDate ? format(new Date(subscription.startDate), "yyyy-MM-dd") : "N/A",
          "End Date": subscription?.endDate ? format(new Date(subscription.endDate), "yyyy-MM-dd") : "N/A",
          "Paid At": payment.paidAt ? format(new Date(payment.paidAt), "yyyy-MM-dd HH:mm:ss") : "N/A",
          "Created At": format(new Date(payment.createdAt), "yyyy-MM-dd HH:mm:ss"),
        };
      });
      
      const subscriptionWorksheet = XLSX.utils.json_to_sheet(subscriptionSheetData);
      
      
      // Auto-size columns
      const subCols = Object.keys(subscriptionSheetData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      subscriptionWorksheet['!cols'] = subCols;

      XLSX.utils.book_append_sheet(workbook, subscriptionWorksheet, "Subscriptions");
    }

    // Sheet 3: Summary
    if (salesSummary) {
      const summaryData = [
        { "Metric": "Report Period", "Value": `${format(startDate, "PPP")} - ${format(endDate, "PPP")}` },
        { "Metric": "Generated At", "Value": format(new Date(), "PPP p") },
        { "Metric": "Total Revenue", "Value": formatRupiah(salesSummary.summary.totalRevenue) },
        { "Metric": "Total Transactions", "Value": salesSummary.summary.totalTransactions.toString() },
        { "Metric": "Average Transaction", "Value": formatRupiah(salesSummary.summary.averageTransactionValue) },
        { "Metric": "POS Revenue", "Value": formatRupiah(salesSummary.summary.posRevenue) },
        { "Metric": "Subscription Revenue", "Value": formatRupiah(salesSummary.summary.subscriptionRevenue) },
      ];

      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      
      // Auto-size columns
      const summaryCols = Object.keys(summaryData[0] || {}).map(key => ({
        wch: Math.max(key.length, 20)
      }));
      summaryWorksheet['!cols'] = summaryCols;

      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");
    }

    // Generate and download file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales-report-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.xlsx`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  if (isLoadingSummary || !salesSummary) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Sales Report</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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

  return (
    <ProtectedRoute requiredPermissions={["report:sales"]}>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Sales Report</h1>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-pos"
                  checked={includePos}
                  onChange={(e) => setIncludePos(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="include-pos">Include POS Sales</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-subscriptions"
                  checked={includeSubscriptions}
                  onChange={(e) => setIncludeSubscriptions(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="include-subscriptions">Include Subscriptions</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(salesSummary.summary.totalRevenue)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {salesSummary.summary.totalTransactions}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(salesSummary.summary.averageTransactionValue)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">POS Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(salesSummary.summary.posRevenue)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {salesSummary.paymentMethodBreakdown.map((item: PaymentMethodBreakdown, index: number) => (
                <div key={index} className="flex justify-between items-center p-2  rounded">
                  <span className="font-medium">{item.method}</span>
                  <span>{item.count} transactions · {formatRupiah(item.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {salesSummary.topSellingItems.slice(0, 5).map((item: TopSellingItem, index: number) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{item.name}</span>
                    <span className="text-sm font-medium">{formatRupiah(item.revenue)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {salesSummary.dailyBreakdown.slice(-7).map((item: DailyBreakdown, index: number) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{format(new Date(item.date), "MMM d")}</span>
                    <span className="text-sm font-medium">{formatRupiah(item.revenue)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Summary */}
        {salesSummary.monthlySummary && (
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue - {new Date().getFullYear()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {salesSummary.monthlySummary.map((month: MonthlySummary, index: number) => (
                  <div key={index} className="text-center p-4  rounded">
                    <div className="text-sm font-medium">{month.monthName}</div>
                    <div className="text-lg font-bold">{formatRupiah(month.revenue)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}