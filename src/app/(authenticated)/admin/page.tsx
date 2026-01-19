"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, CreditCard, UserCog, RefreshCw, UserPlus, TrendingUp, Dumbbell, UsersRound } from "lucide-react";
import { api } from "@/trpc/react";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DashboardPage: React.FC = () => {
  // Get current month date range
  const getCurrentMonthDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  };

  const currentMonth = getCurrentMonthDates();
  const [startDate, setStartDate] = useState<string>(currentMonth.start);
  const [endDate, setEndDate] = useState<string>(currentMonth.end);
  const [appliedStartDate, setAppliedStartDate] = useState<Date>(new Date(currentMonth.start));
  const [appliedEndDate, setAppliedEndDate] = useState<Date>(new Date(currentMonth.end));

  const handleApplyFilter = () => {
    if (startDate && endDate) {
      setAppliedStartDate(new Date(startDate));
      setAppliedEndDate(new Date(endDate));
    }
  };

  const { data: memberData, isLoading: memberLoading } =
    api.member.getAllActive.useQuery();

  const { data: employeeData, isLoading: employeeLoading } =
    api.employee.list.useQuery({
      page: 1,
      limit: 1,
      search: "",
      searchColumn: "",
    });

  const { data: transactionData, isLoading: transactionLoading } =
    api.subs.list.useQuery({
      page: 1,
      limit: 5,
    });

  // Query admin dashboard stats with date range
  const { data: dashboardStats, isLoading: statsLoading } =
    api.subs.getAdminDashboardStats.useQuery(
      {
        startDate: appliedStartDate,
        endDate: appliedEndDate,
      },
      {
        enabled: !!appliedStartDate && !!appliedEndDate,
      }
    );

  const activeMembers =
    memberData?.filter((member) =>
      member.subscriptions.some((sub) => sub.isActive)
    ).length ?? 0;
  const totalEmployees = employeeData?.total ?? 0;
  const latestTransactions = transactionData?.items ?? [];

  // Format currency as Indonesian Rupiah
  const formatRupiah = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  return (
    <ProtectedRoute requiredPermissions={["menu:dashboard-admin"]}>
      <div className="flex flex-col gap-6 p-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome, Admin!</p>
        </div>

        {/* Date Range Filter */}
        <Card className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">Start Date:</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">End Date:</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <Button onClick={handleApplyFilter} variant="default">
              Apply Filter
            </Button>
          </div>
        </Card>

        {/* Existing Statistics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-500/20 p-3">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Members</p>
                <h2 className="text-2xl font-bold">
                  {memberLoading ? "..." : activeMembers}
                </h2>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-500/20 p-3">
                <UserCog className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <h2 className="text-2xl font-bold">
                  {employeeLoading ? "..." : totalEmployees}
                </h2>
                </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-500/20 p-3">
                <CreditCard className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Latest Transactions
                </p>
                <h2 className="text-2xl font-bold">
                  {transactionLoading ? "..." : latestTransactions.length}
                </h2>
              </div>
            </div>
          </Card>
        </div>

        {/* New Statistics - Admin Dashboard Stats */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Subscription Statistics</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-cyan-500/20 p-3">
                  <Users className="h-6 w-6 text-cyan-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Subscription</p>
                  <h2 className="text-2xl font-bold">
                    {statsLoading ? "..." : dashboardStats?.activeMembershipsCount ?? 0}
                  </h2>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-orange-500/20 p-3">
                  <RefreshCw className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Renewals</p>
                  <h2 className="text-2xl font-bold">
                    {statsLoading ? "..." : dashboardStats?.totalRenewals ?? 0}
                  </h2>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-emerald-500/20 p-3">
                  <UserPlus className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total New Members</p>
                  <h2 className="text-2xl font-bold">
                    {statsLoading ? "..." : dashboardStats?.totalNewMembers ?? 0}
                  </h2>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Subscription Type Breakdown */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Subscription Sales</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-indigo-500/20 p-3">
                  <TrendingUp className="h-6 w-6 text-indigo-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Membership</p>
                  <h2 className="text-2xl font-bold">
                    {statsLoading ? "..." : dashboardStats?.subscriptionTypeBreakdown.MEMBERSHIP.count ?? 0}
                  </h2>
                  <p className="text-sm font-medium text-indigo-600">
                    {statsLoading ? "..." : formatRupiah(dashboardStats?.subscriptionTypeBreakdown.MEMBERSHIP.revenue ?? 0)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-pink-500/20 p-3">
                  <Dumbbell className="h-6 w-6 text-pink-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Personal Trainer</p>
                  <h2 className="text-2xl font-bold">
                    {statsLoading ? "..." : dashboardStats?.subscriptionTypeBreakdown.PERSONAL_TRAINER.count ?? 0}
                  </h2>
                  <p className="text-sm font-medium text-pink-600">
                    {statsLoading ? "..." : formatRupiah(dashboardStats?.subscriptionTypeBreakdown.PERSONAL_TRAINER.revenue ?? 0)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-amber-500/20 p-3">
                  <UsersRound className="h-6 w-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Group Trainer</p>
                  <h2 className="text-2xl font-bold">
                    {statsLoading ? "..." : dashboardStats?.subscriptionTypeBreakdown.GROUP_TRAINER.count ?? 0}
                  </h2>
                  <p className="text-sm font-medium text-amber-600">
                    {statsLoading ? "..." : formatRupiah(dashboardStats?.subscriptionTypeBreakdown.GROUP_TRAINER.revenue ?? 0)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {latestTransactions.length > 0 && (
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Recent Transactions</h3>
            <div className="space-y-4">
              {latestTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <div>
                    <p className="font-medium">{transaction.member.user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.package.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      Rp {transaction.package.price.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.payments[0]?.paidAt
                        ? new Date(
                            transaction.payments[0].paidAt,
                          ).toLocaleDateString()
                        : "No payment date"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage;
