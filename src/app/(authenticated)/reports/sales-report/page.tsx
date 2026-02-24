"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    gymMembershipRevenue: number;
    personalTrainerRevenue: number;
    groupTrainingRevenue: number;
    transferRevenue: number;
    freezeRevenue: number;
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
  const [includeTransfer, setIncludeTransfer] = useState(true);
  const [includeFreeze, setIncludeFreeze] = useState(true);
  const [salesTab, setSalesTab] = useState<"ALL" | "GYM_MEMBERSHIP" | "PERSONAL_TRAINER" | "GROUP_TRAINING">("ALL");
  const [salesPersonFilter, setSalesPersonFilter] = useState<string>("all");

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


  
  const { data: salesPersonList } = api.salesReport.getSalesList.useQuery();

  const { data: subscriptionData } = api.paymentValidation.getActive.useQuery(
    {
      startDate: startDate,
      endDate: endDate,
    }
  );

  // Filter subscription data by selected sales person
  const filteredBySpSubscriptionData = salesPersonFilter === "all"
    ? subscriptionData
    : subscriptionData?.filter((p: any) => p.subscription?.salesId === salesPersonFilter);

  const { data: transferData } = api.salesReport.getTransferHistory.useQuery(
    { startDate, endDate },
    { enabled: includeTransfer }
  );

  const { data: freezeData } = api.salesReport.getFreezeHistory.useQuery(
    { startDate, endDate },
    { enabled: includeFreeze }
  );
  
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
        const trainer = subscription?.trainer;
      
        return {
          "Payment ID": payment.id,
          "Member Name": user?.name || "N/A",
          "Email": user?.email || "N/A",
          "Package": subscription?.package?.name || "N/A",
          "Type": subscription?.package?.type === "GYM_MEMBERSHIP" ? "Gym Membership" : subscription?.package?.type === "PERSONAL_TRAINER" ? "Personal Trainer" : "Group Training",
          "Trainer": trainer?.user?.name || "N/A",
          "Sales Person": payment.salesPersonName || "N/A",
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

      // Calculate package type totals
      const gymMembershipRevenue = subscriptionData?.reduce((total, payment) => {
        if (payment.subscription?.package?.type === "GYM_MEMBERSHIP") {
          return total + (payment.totalPayment || 0);
        }
        return total;
      }, 0) || 0;

      const personalTrainerRevenue = subscriptionData?.reduce((total, payment) => {
        if (payment.subscription?.package?.type === "PERSONAL_TRAINER") {
          return total + (payment.totalPayment || 0);
        }
        return total;
      }, 0) || 0;

      const groupTrainingRevenue = subscriptionData?.reduce((total, payment) => {
        if (payment.subscription?.package?.type === "GROUP_TRAINING") {
          return total + (payment.totalPayment || 0);
        }
        return total;
      }, 0) || 0;

      // Sheet: Gym Membership
      const gymMembershipData = subscriptionData?.filter(
        (payment: any) => payment.subscription?.package?.type === "GYM_MEMBERSHIP"
      ).map((payment: any) => {
        const subscription = payment.subscription;
        const member = subscription?.member;
        const user = member?.user;
        const trainer = subscription?.trainer;
      
        return {
          "Payment ID": payment.id,
          "Member Name": user?.name || "N/A",
          "Email": user?.email || "N/A",
          "Package": subscription?.package?.name || "N/A",
          "Type": "Gym Membership",
          "Trainer": trainer?.user?.name || "N/A",
          "Sales Person": payment.salesPersonName || "N/A",
          "Amount": payment.totalPayment || 0,
          "Payment Method": payment.method || "Manual Payment",
          "Status": payment.status,
          "Start Date": subscription?.startDate ? format(new Date(subscription.startDate), "yyyy-MM-dd") : "N/A",
          "End Date": subscription?.endDate ? format(new Date(subscription.endDate), "yyyy-MM-dd") : "N/A",
          "Paid At": payment.paidAt ? format(new Date(payment.paidAt), "yyyy-MM-dd HH:mm:ss") : "N/A",
          "Created At": format(new Date(payment.createdAt), "yyyy-MM-dd HH:mm:ss"),
        };
      });

      if (gymMembershipData && gymMembershipData.length > 0) {
        const gymWorksheet = XLSX.utils.json_to_sheet(gymMembershipData);
        const gymCols = Object.keys(gymMembershipData[0] || {}).map(key => ({
          wch: Math.max(key.length, 15)
        }));
        gymWorksheet['!cols'] = gymCols;
        XLSX.utils.book_append_sheet(workbook, gymWorksheet, "Gym Membership");
      }

      // Sheet: Personal Training
      const personalTrainerData = subscriptionData?.filter(
        (payment: any) => payment.subscription?.package?.type === "PERSONAL_TRAINER"
      ).map((payment: any) => {
        const subscription = payment.subscription;
        const member = subscription?.member;
        const user = member?.user;
        const trainer = subscription?.trainer;
      
        return {
          "Payment ID": payment.id,
          "Member Name": user?.name || "N/A",
          "Email": user?.email || "N/A",
          "Package": subscription?.package?.name || "N/A",
          "Type": "Personal Trainer",
          "Trainer": trainer?.user?.name || "N/A",
          "Sales Person": payment.salesPersonName || "N/A",
          "Amount": payment.totalPayment || 0,
          "Payment Method": payment.method || "Manual Payment",
          "Status": payment.status,
          "Start Date": subscription?.startDate ? format(new Date(subscription.startDate), "yyyy-MM-dd") : "N/A",
          "End Date": subscription?.endDate ? format(new Date(subscription.endDate), "yyyy-MM-dd") : "N/A",
          "Paid At": payment.paidAt ? format(new Date(payment.paidAt), "yyyy-MM-dd HH:mm:ss") : "N/A",
          "Created At": format(new Date(payment.createdAt), "yyyy-MM-dd HH:mm:ss"),
        };
      });

      if (personalTrainerData && personalTrainerData.length > 0) {
        const ptWorksheet = XLSX.utils.json_to_sheet(personalTrainerData);
        const ptCols = Object.keys(personalTrainerData[0] || {}).map(key => ({
          wch: Math.max(key.length, 15)
        }));
        ptWorksheet['!cols'] = ptCols;
        XLSX.utils.book_append_sheet(workbook, ptWorksheet, "Personal Training");
      }

      // Sheet: Group Training
      const groupTrainingData = subscriptionData?.filter(
        (payment: any) => payment.subscription?.package?.type === "GROUP_TRAINING"
      ).map((payment: any) => {
        const subscription = payment.subscription;
        const member = subscription?.member;
        const user = member?.user;
        const trainer = subscription?.trainer;
      
        return {
          "Payment ID": payment.id,
          "Member Name": user?.name || "N/A",
          "Email": user?.email || "N/A",
          "Package": subscription?.package?.name || "N/A",
          "Type": "Group Training",
          "Trainer": trainer?.user?.name || "N/A",
          "Sales Person": payment.salesPersonName || "N/A",
          "Amount": payment.totalPayment || 0,
          "Payment Method": payment.method || "Manual Payment",
          "Status": payment.status,
          "Start Date": subscription?.startDate ? format(new Date(subscription.startDate), "yyyy-MM-dd") : "N/A",
          "End Date": subscription?.endDate ? format(new Date(subscription.endDate), "yyyy-MM-dd") : "N/A",
          "Paid At": payment.paidAt ? format(new Date(payment.paidAt), "yyyy-MM-dd HH:mm:ss") : "N/A",
          "Created At": format(new Date(payment.createdAt), "yyyy-MM-dd HH:mm:ss"),
        };
      });

      if (groupTrainingData && groupTrainingData.length > 0) {
        const gtWorksheet = XLSX.utils.json_to_sheet(groupTrainingData);
        const gtCols = Object.keys(groupTrainingData[0] || {}).map(key => ({
          wch: Math.max(key.length, 15)
        }));
        gtWorksheet['!cols'] = gtCols;
        XLSX.utils.book_append_sheet(workbook, gtWorksheet, "Group Training");
      }
    }

    // Transfer Sheet
    if (includeTransfer && transferData && transferData.length > 0) {
      const transferSheetData = transferData.map((transfer: any) => ({
        "Transfer ID": transfer.id,
        "From Member": transfer.fromMemberName || "N/A",
        "To Member": transfer.subscription?.member?.user?.name || "N/A",
        "Package": transfer.subscription?.package?.name || "N/A",
        "Amount": transfer.amount || 0,
        "Transferred Points": transfer.transferredPoint || 0,
        "Reason": transfer.reason || "N/A",
        "Created At": format(new Date(transfer.createdAt), "yyyy-MM-dd HH:mm:ss"),
      }));
      const transferWorksheet = XLSX.utils.json_to_sheet(transferSheetData);
      const transferCols = Object.keys(transferSheetData[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
      transferWorksheet['!cols'] = transferCols;
      XLSX.utils.book_append_sheet(workbook, transferWorksheet, "Transfers");
    }

    // Freeze Sheet
    if (includeFreeze && freezeData && freezeData.length > 0) {
      const freezeSheetData = freezeData.map((freeze: any) => ({
        "Freeze ID": freeze.id,
        "Member": freeze.memberName || "N/A",
        "Email": freeze.memberEmail || "N/A",
        "Packages Frozen": freeze.subscriptions?.map((s: any) => s.packageName).join(", ") || "N/A",
        "Number of Packages": freeze.subscriptions?.length || 0,
        "Freeze Days": freeze.freezeDays || 0,
        "Price": freeze.price || 0,
        "Performed By": freeze.performedBy?.name || "N/A",
        "Performed At": format(new Date(freeze.performedAt), "yyyy-MM-dd HH:mm:ss"),
      }));
      const freezeWorksheet = XLSX.utils.json_to_sheet(freezeSheetData);
      const freezeCols = Object.keys(freezeSheetData[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
      freezeWorksheet['!cols'] = freezeCols;
      XLSX.utils.book_append_sheet(workbook, freezeWorksheet, "Freeze Operations");
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
        { "Metric": "Gym Membership Revenue", "Value": formatRupiah(
          subscriptionData?.reduce((total, payment) => {
            if (payment.subscription?.package?.type === "GYM_MEMBERSHIP") {
              return total + (payment.totalPayment || 0);
            }
            return total;
          }, 0) || 0
        ) },
        { "Metric": "Personal Trainer Revenue", "Value": formatRupiah(
          subscriptionData?.reduce((total, payment) => {
            if (payment.subscription?.package?.type === "PERSONAL_TRAINER") {
              return total + (payment.totalPayment || 0);
            }
            return total;
          }, 0) || 0
        ) },
        { "Metric": "Group Training Revenue", "Value": formatRupiah(
          subscriptionData?.reduce((total, payment) => {
            if (payment.subscription?.package?.type === "GROUP_TRAINING") {
              return total + (payment.totalPayment || 0);
            }
            return total;
          }, 0) || 0
        ) },
        { "Metric": "Transfer Revenue", "Value": formatRupiah(salesSummary.summary.transferRevenue) },
        { "Metric": "Freeze Revenue", "Value": formatRupiah(salesSummary.summary.freezeRevenue) },
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
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-transfer"
                  checked={includeTransfer}
                  onChange={(e) => setIncludeTransfer(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="include-transfer">Include Transfer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-freeze"
                  checked={includeFreeze}
                  onChange={(e) => setIncludeFreeze(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="include-freeze">Include Freeze</Label>
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gym Membership Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(
                  subscriptionData?.reduce((total, payment) => {
                    if (payment.subscription?.package?.type === "GYM_MEMBERSHIP") {
                      return total + (payment.totalPayment || 0);
                    }
                    return total;
                  }, 0) || 0
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Personal Trainer Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(
                  subscriptionData?.reduce((total, payment) => {
                    if (payment.subscription?.package?.type === "PERSONAL_TRAINER") {
                      return total + (payment.totalPayment || 0);
                    }
                    return total;
                  }, 0) || 0
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Group Training Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(
                  subscriptionData?.reduce((total, payment) => {
                    if (payment.subscription?.package?.type === "GROUP_TRAINING") {
                      return total + (payment.totalPayment || 0);
                    }
                    return total;
                  }, 0) || 0
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transfer Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(salesSummary.summary.transferRevenue)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Freeze Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRupiah(salesSummary.summary.freezeRevenue)}
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
                    <span className="text-sm">{format(new Date(item.date), "dd/MM")}</span>
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

        {/* Subscription Data Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <CardTitle>Subscription Data</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Sales Person</Label>
                <Select value={salesPersonFilter} onValueChange={setSalesPersonFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Sales" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sales</SelectItem>
                    {salesPersonList?.map((sp: any) => (
                      <SelectItem key={sp.id} value={sp.id}>{sp.name} ({sp.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-4 border-b pb-2">
              {([
                { key: "ALL", label: "All", count: filteredBySpSubscriptionData?.length ?? 0, color: "bg-gray-800" },
                { key: "GYM_MEMBERSHIP", label: "Gym", count: filteredBySpSubscriptionData?.filter((p: any) => p.subscription?.package?.type === "GYM_MEMBERSHIP").length ?? 0, color: "bg-blue-600" },
                { key: "PERSONAL_TRAINER", label: "PT", count: filteredBySpSubscriptionData?.filter((p: any) => p.subscription?.package?.type === "PERSONAL_TRAINER").length ?? 0, color: "bg-purple-600" },
                { key: "GROUP_TRAINING", label: "Group", count: filteredBySpSubscriptionData?.filter((p: any) => p.subscription?.package?.type === "GROUP_TRAINING").length ?? 0, color: "bg-green-600" },
              ] as const).map(({ key, label, count, color }) => (
                <button
                  key={key}
                  onClick={() => setSalesTab(key)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    salesTab === key ? `${color} text-white` : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                  <span className="ml-1.5 text-xs opacity-75">({count})</span>
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Sales Person</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Paid At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const rows = salesTab === "ALL"
                      ? (filteredBySpSubscriptionData ?? [])
                      : (filteredBySpSubscriptionData ?? []).filter((p: any) => p.subscription?.package?.type === salesTab);
                    if (rows.length === 0) return (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-muted-foreground py-6">No records found</TableCell>
                      </TableRow>
                    );
                    return rows.map((payment: any) => {
                      const subscription = payment.subscription;
                      const member = subscription?.member;
                      const user = member?.user;
                      const trainer = subscription?.trainer;
                      const type = subscription?.package?.type;
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>{user?.name || "N/A"}</TableCell>
                          <TableCell>{subscription?.package?.name || "N/A"}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              type === "GYM_MEMBERSHIP" ? "bg-blue-100 text-blue-800" :
                              type === "PERSONAL_TRAINER" ? "bg-purple-100 text-purple-800" :
                              "bg-green-100 text-green-800"
                            }`}>
                              {type === "GYM_MEMBERSHIP" ? "Gym" : type === "PERSONAL_TRAINER" ? "PT" : "Group"}
                            </span>
                          </TableCell>
                          <TableCell>{trainer?.user?.name || "N/A"}</TableCell>
                          <TableCell>{payment.salesPersonName || "N/A"}</TableCell>
                          <TableCell className="font-medium">{formatRupiah(payment.totalPayment || 0)}</TableCell>
                          <TableCell>{payment.method || "Manual"}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              payment.status === "SUCCESS" ? "bg-green-100 text-green-800" :
                              payment.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {payment.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">{subscription?.startDate ? format(new Date(subscription.startDate), "dd/MM/yyyy") : "N/A"}</TableCell>
                          <TableCell className="text-xs">{subscription?.endDate ? format(new Date(subscription.endDate), "dd/MM/yyyy") : "N/A"}</TableCell>
                          <TableCell className="text-xs">{payment.paidAt ? format(new Date(payment.paidAt), "dd/MM/yyyy HH:mm") : "N/A"}</TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Transfer History Table */}
        {includeTransfer && (
          <Card>
            <CardHeader>
              <CardTitle>Transfer History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From Member</TableHead>
                      <TableHead>To Member</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Transferred Points</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!transferData || transferData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6">No transfer records found</TableCell>
                      </TableRow>
                    ) : transferData.map((transfer: any) => (
                      <TableRow key={transfer.id}>
                        <TableCell>{transfer.fromMemberName || "N/A"}</TableCell>
                        <TableCell>{transfer.subscription?.member?.user?.name || "N/A"}</TableCell>
                        <TableCell>{transfer.subscription?.package?.name || "N/A"}</TableCell>
                        <TableCell className="font-medium">{formatRupiah(transfer.amount || 0)}</TableCell>
                        <TableCell>{transfer.transferredPoint || 0}</TableCell>
                        <TableCell className="text-xs">{transfer.reason || "N/A"}</TableCell>
                        <TableCell className="text-xs">{format(new Date(transfer.createdAt), "dd/MM/yyyy HH:mm")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Freeze History Table */}
        {includeFreeze && (
          <Card>
            <CardHeader>
              <CardTitle>Freeze History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Packages Frozen</TableHead>
                      <TableHead># Packages</TableHead>
                      <TableHead>Freeze Days</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Performed By</TableHead>
                      <TableHead>Performed At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!freezeData || freezeData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-6">No freeze records found</TableCell>
                      </TableRow>
                    ) : freezeData.map((freeze: any) => (
                      <TableRow key={freeze.id}>
                        <TableCell>{freeze.memberName || "N/A"}</TableCell>
                        <TableCell className="text-xs">{freeze.memberEmail || "N/A"}</TableCell>
                        <TableCell className="text-xs">{freeze.subscriptions?.map((s: any) => s.packageName).join(", ") || "N/A"}</TableCell>
                        <TableCell>{freeze.subscriptions?.length || 0}</TableCell>
                        <TableCell>{freeze.freezeDays || 0} days</TableCell>
                        <TableCell className="font-medium">{formatRupiah(freeze.price || 0)}</TableCell>
                        <TableCell>{freeze.performedBy?.name || "N/A"}</TableCell>
                        <TableCell className="text-xs">{format(new Date(freeze.performedAt), "dd/MM/yyyy HH:mm")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}