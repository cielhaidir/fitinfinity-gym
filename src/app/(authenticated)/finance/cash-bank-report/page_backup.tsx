"use client";

import { api } from "@/trpc/react";
import { useState } from "react";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { CashBankReportItem, CashBankReportSummary } from "@/server/api/routers/cashBankReport";
import * as XLSX from 'xlsx-js-style';

const CashBankReportPage = () => {
  const [startDate, setStartDate] = useState(startOfDay(subDays(new Date(), 30)));
  const [endDate, setEndDate] = useState(endOfDay(new Date()));
  const [balanceAccountId, setBalanceAccountId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sortBy, setSortBy] = useState<'date' | 'debit' | 'credit'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading Cash Bank Report...</p>
        </div>
      </div>
    );
  }

  if (reportError || summaryError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full mx-4">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6 text-center">
            <div className="w-12 h-12 mx-auto bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">Error Loading Report</h3>
            <p className="text-red-600 dark:text-red-400">{reportError?.message || summaryError?.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const handleExport = () => {
    console.log("Exporting to Excel...");
    const dataToExport = items.map(item => ({
      'Reference ID': item.referenceId,
      'Date': new Date(item.date).toLocaleDateString(),
      'Type': item.type,
      'Description': item.description,
      'Debit OC': item.debit,
      'Credit OC': item.credit,
      'Balance Account': item.balanceAccount || 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cash Bank Report");
    XLSX.writeFile(wb, "CashBankReport.xlsx");
  };

  const handleSort = (column: 'date' | 'debit' | 'credit') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc'); // Default to descending when changing sort column
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header and Export Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-200 dark:border-gray-700 mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Cash Bank Report</h1>
        <button
          onClick={handleExport}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export to Excel
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Total Credits</h2>
            <p className="text-3xl font-bold text-green-600 mt-1">{totalCredits.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
          </div>
          <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full">
            <svg className="w-8 h-8 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Total Debits</h2>
            <p className="text-3xl font-bold text-red-600 mt-1">{totalDebits.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
          </div>
          <div className="p-3 bg-red-100 dark:bg-red-800 rounded-full">
            <svg className="w-8 h-8 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Net Balance</h2>
            <p className={`text-3xl font-bold mt-1 ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600 dark:text-red-300'}`}>
              {netBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </p>
          </div>
          <div className={`p-3 rounded-full ${netBalance >= 0 ? 'bg-blue-100 dark:bg-blue-800' : 'bg-red-100 dark:bg-red-800'}`}>
            <svg className={`w-8 h-8 ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600 dark:text-red-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21H6.737a2 2 0 01-1.789-2.894l3.5-7A2 2 0 019.237 10h4.747M12 3v7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
            <input
              type="date"
              id="startDate"
              value={startDate.toISOString().split('T')[0]}
              onChange={(e) => setStartDate(startOfDay(new Date(e.target.value)))}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
            <input
              type="date"
              id="endDate"
              value={endDate.toISOString().split('T')[0]}
              onChange={(e) => setEndDate(endOfDay(new Date(e.target.value)))}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
            />
          </div>
          <div>
            <label htmlFor="balanceAccount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Balance Account</label>
            <select
              id="balanceAccount"
              value={balanceAccountId || ''}
              onChange={(e) => setBalanceAccountId(e.target.value ? Number(e.target.value) : undefined)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
            >
              <option value="">All Accounts</option>
              {balanceAccounts?.map((account: { id: number; name: string; account_number: string }) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Period Closing Section */}
      {balanceAccountId && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Period Closing</h2>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              {periodClosedData?.isClosed ? (
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">Period is closed</span>
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    (Closed on {periodClosedData.closingData ? new Date(periodClosedData.closingData.closedAt).toLocaleDateString() : 'N/A'})
                  </span>
                </div>
              ) : (
                <div className="flex items-center text-amber-600 dark:text-amber-400">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Period is open</span>
                </div>
              )}
            </div>
            {!periodClosedData?.isClosed && (
              <button
                onClick={() => setShowClosingModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Close Period
              </button>
            )}
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reference ID</th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                onClick={() => handleSort('date')}
              >
                Date {sortBy === 'date' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                onClick={() => handleSort('debit')}
              >
                Debit OC {sortBy === 'debit' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                onClick={() => handleSort('credit')}
              >
                Credit OC {sortBy === 'credit' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Balance Account</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-center text-gray-500 dark:text-gray-400 text-sm">No records found for the selected criteria.</td>
              </tr>
            ) : (
              items.map((item: CashBankReportItem) => (
                  <tr key={item.referenceId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{item.referenceId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate">{item.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-300 font-medium">{item.debit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-300 font-medium">{item.credit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.balanceAccount || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.total > 0 && (
            <nav
              className="flex items-center justify-between px-4 py-3 sm:px-6 mt-4 bg-gray-50 dark:bg-gray-700 rounded-b-lg"
              aria-label="Pagination"
            >
              <div className="hidden sm:block">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(page * limit, pagination.total)}</span> of{' '}
                  <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div className="flex-1 flex justify-between sm:justify-end">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  disabled={pagination.page === pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </nav>
          )}
        </div>
      </div>

      {/* Period Closing Modal */}
      {showClosingModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-800 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                    Close Period
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Are you sure you want to close this period? This will lock all transactions from{' '}
                      <strong>{startDate.toLocaleDateString()}</strong> to{' '}
                      <strong>{endDate.toLocaleDateString()}</strong> for the selected account.
                    </p>
                    <div className="mt-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Summary:</h4>
                      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <div className="flex justify-between">
                          <span>Total Credits:</span>
                          <span className="font-medium text-green-600">
                            {totalCredits.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Debits:</span>
                          <span className="font-medium text-red-600">
                            {totalDebits.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1">
                          <span className="font-medium">Net Balance:</span>
                          <span className={`font-medium ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {netBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
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
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {closePeriodMutation.isPending ? 'Closing...' : 'Close Period'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowClosingModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashBankReportPage;