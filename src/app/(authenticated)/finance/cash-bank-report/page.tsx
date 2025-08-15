"use client";

import { api } from "@/trpc/react";
import { useState } from "react";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { CashBankReportItem, CashBankReportSummary } from "@/server/api/routers/cashBankReport";
import * as XLSX from 'xlsx-js-style';
import { Download, Lock, Unlock, AlertCircle, TrendingUp, TrendingDown, Scale, ChevronUp, ChevronDown } from "lucide-react";

// shadcn/ui components
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";
import { Skeleton } from "@/app/_components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/_components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/_components/ui/dialog";
import { Separator } from "@/app/_components/ui/separator";

const CashBankReportPage = () => {
  const [startDate, setStartDate] = useState(startOfDay(subDays(new Date(), 30)));
  const [endDate, setEndDate] = useState(endOfDay(new Date()));
  const [balanceAccountId, setBalanceAccountId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sortBy, setSortBy] = useState<'date' | 'debit' | 'credit'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showClosingModal, setShowClosingModal] = useState(false);

  const { data: reportData, isLoading: isReportLoading, error: reportError } = api.cashBankReport.getCashBankReport.useQuery({
    startDate,
    endDate,
    balanceAccountId,
    page,
    limit,
    sortBy,
    sortOrder,
  });
  console.log("Cash Bank Report Data:", reportData);
  const { data: summaryData, isLoading: isSummaryLoading, error: summaryError } = api.cashBankReport.getCashBankSummary.useQuery({
    startDate,
    endDate,
    balanceAccountId,
  });

  const { data: balanceAccounts, isLoading: isBalanceAccountsLoading } = api.cashBankReport.getBalanceAccounts.useQuery();

  // Period closing queries and mutations
  const { data: periodClosedData } = api.cashBankReport.isPeriodClosed.useQuery({
    balanceAccountId: balanceAccountId || 0,
    startDate,
    endDate,
  }, {
    enabled: !!balanceAccountId
  });

  const closePeriodMutation = api.cashBankReport.closePeriod.useMutation({
    onSuccess: () => {
      setShowClosingModal(false);
      // Refetch data after closing
      void reportData;
      void summaryData;
    },
  });

  const { data: closingHistory } = api.cashBankReport.getPeriodClosingHistory.useQuery({
    balanceAccountId,
    page: 1,
    limit: 10,
  });

  // Initialize with default values, so they are always in scope
  const items: CashBankReportItem[] = reportData?.items || [];
  const pagination = reportData?.pagination || { page: 1, limit: 50, totalPages: 1, total: 0 };
  const totalCredits: number = summaryData?.totalCredits || 0;
  const totalDebits: number = summaryData?.totalDebits || 0;
  const netBalance: number = summaryData?.netBalance || 0;

  if (isReportLoading || isSummaryLoading || isBalanceAccountsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-[250px]" />
        </div>
      </div>
    );
  }

  if (reportError || summaryError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Error Loading Report</CardTitle>
            <CardDescription>
              {reportError?.message || summaryError?.message}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleExport = async () => {
    console.log("Exporting to Excel...");
    type ExportedItem = {
      'Reference ID': string;
      Date: string;
      Type: "Payment" | "Transaction" | "POS" | "Initial Balance";
      Description: string;
      'Debit OC': number;
      'Credit OC': number;
      'Balance Account': string;
      'Ending Balance'?: number;
    };

    const wb = XLSX.utils.book_new();

    if (balanceAccountId) {
      // Export only the selected balance account
      const selectedAccount = balanceAccounts?.find(acc => acc.id === balanceAccountId);
      const accountName = selectedAccount?.name || `Account ${balanceAccountId}`;
      
      const dataToExport: ExportedItem[] = items.map(item => ({
        'Reference ID': item.referenceId,
        'Date': new Date(item.date).toLocaleDateString(),
        'Type': item.type,
        'Description': item.description,
        'Debit OC': item.debit,
        'Credit OC': item.credit,
        'Balance Account': item.balanceAccount || 'N/A',
        'Ending Balance': item.endingBalance !== undefined ? item.endingBalance : 0,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const sheetName = accountName.length > 31 ? accountName.substring(0, 31) : accountName;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    } else {
      // Export all balance accounts, one sheet per account
      if (balanceAccounts && balanceAccounts.length > 0) {
        for (const account of balanceAccounts) {
          try {
            // Fetch data for each balance account
            const accountReportData = await api.cashBankReport.getCashBankReport.fetch({
              startDate,
              endDate,
              balanceAccountId: account.id,
              page: 1,
              limit: 10000, // Get all records for export
              sortBy,
              sortOrder,
            });

            const accountItems = accountReportData?.items || [];
            const dataToExport: ExportedItem[] = accountItems.map(item => ({
              'Reference ID': item.referenceId,
              'Date': new Date(item.date).toLocaleDateString(),
              'Type': item.type,
              'Description': item.description,
              'Debit OC': item.debit,
              'Credit OC': item.credit,
              'Balance Account': item.balanceAccount || 'N/A',
              'Ending Balance': item.endingBalance !== undefined ? item.endingBalance : 0,
            }));

            if (dataToExport.length > 0) {
              const ws = XLSX.utils.json_to_sheet(dataToExport);
              const sheetName = account.name.length > 31 ? account.name.substring(0, 31) : account.name;
              XLSX.utils.book_append_sheet(wb, ws, sheetName);
            }
          } catch (error) {
            console.error(`Error fetching data for account ${account.name}:`, error);
          }
        }
      }
      
      // If no sheets were added, add an empty sheet
      if (wb.SheetNames.length === 0) {
        const emptyData = [{ Message: 'No data found for the selected criteria' }];
        const ws = XLSX.utils.json_to_sheet(emptyData);
        XLSX.utils.book_append_sheet(wb, ws, "No Data");
      }
    }

    const filename = balanceAccountId
      ? `CashBankReport_${balanceAccounts?.find(acc => acc.id === balanceAccountId)?.name || 'Account'}.xlsx`
      : "CashBankReport_AllAccounts.xlsx";
    
    XLSX.writeFile(wb, filename);
  };

  const handleSort = (column: 'date' | 'debit' | 'credit') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc'); // Default to descending when changing sort column
    }
  };

  const getSortIcon = (column: 'date' | 'debit' | 'credit') => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />;
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl space-y-6">
      {/* Header and Export Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Cash Bank Report</h1>
        <Button onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalCredits.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totalDebits.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {netBalance.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                id="startDate"
                value={startDate.toISOString().split('T')[0]}
                onChange={(e) => setStartDate(startOfDay(new Date(e.target.value)))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                type="date"
                id="endDate"
                value={endDate.toISOString().split('T')[0]}
                onChange={(e) => setEndDate(endOfDay(new Date(e.target.value)))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="balanceAccount">Balance Account</Label>
              <Select
                value={balanceAccountId?.toString() || undefined}
                onValueChange={(value) => setBalanceAccountId(value && value !== "all" ? Number(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {balanceAccounts?.map((account: { id: number; name: string; account_number: string }) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Closing Section */}
      {balanceAccountId && (
        <Card>
          <CardHeader>
            <CardTitle>Period Closing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                {periodClosedData?.isClosed ? (
                  <>
                    <Lock className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-600">Period is closed</span>
                    <span className="text-sm text-muted-foreground">
                      (Closed on {periodClosedData.closingData ? new Date(periodClosedData.closingData.closedAt).toLocaleDateString() : 'N/A'})
                    </span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-5 w-5 text-amber-600" />
                    <span className="font-medium text-amber-600">Period is open</span>
                  </>
                )}
              </div>
              {!periodClosedData?.isClosed && (
                <Button onClick={() => setShowClosingModal(true)} className="gap-2">
                  <Lock className="h-4 w-4" />
                  Close Period
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference ID</TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center">
                    Date
                    {getSortIcon('date')}
                  </div>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('debit')}
                >
                  <div className="flex items-center">
                    Debit OC
                    {getSortIcon('debit')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('credit')}
                >
                  <div className="flex items-center">
                    Credit OC
                    {getSortIcon('credit')}
                  </div>
                </TableHead>
                <TableHead>Balance Account</TableHead>
                {balanceAccountId && (
                  <TableHead>Ending Balance</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={balanceAccountId ? 8 : 7} className="text-center text-muted-foreground">
                    No records found for the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item: CashBankReportItem) => (
                  <TableRow key={item.referenceId}>
                    <TableCell className="font-medium">{item.referenceId}</TableCell>
                    <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {item.debit.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                    </TableCell>
                    <TableCell className="text-red-600 font-medium">
                      {item.credit.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                    </TableCell>
                    <TableCell>{item.balanceAccount || 'N/A'}</TableCell>
                    {balanceAccountId && (
                      <TableCell className="text-blue-600 font-medium">
                        {item.endingBalance !== undefined ? item.endingBalance.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }) : '-'}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.total > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between px-6 py-4">
                <div className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(page * limit, pagination.total)}</span> of{' '}
                  <span className="font-medium">{pagination.total}</span> results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(prev => Math.min(pagination.totalPages, prev + 1))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Period Closing Modal */}
      <Dialog open={showClosingModal} onOpenChange={setShowClosingModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              Close Period
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to close this period? This will lock all transactions from{' '}
              <strong>{startDate.toLocaleDateString()}</strong> to{' '}
              <strong>{endDate.toLocaleDateString()}</strong> for the selected account.
            </DialogDescription>
          </DialogHeader>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Debits:</span>
                <span className="font-medium text-green-600">
                  {totalDebits.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Credits:</span>
                <span className="font-medium text-red-600">
                  {totalCredits.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-medium">
                <span>Net Balance:</span>
                <span className={netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}>
                  {netBalance.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                </span>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClosingModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (balanceAccountId) {
                  closePeriodMutation.mutate({
                    balanceAccountId,
                    startDate,
                    endDate,
                  });
                }
              }}
              disabled={closePeriodMutation.isPending}
            >
              {closePeriodMutation.isPending ? 'Closing...' : 'Close Period'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashBankReportPage;
