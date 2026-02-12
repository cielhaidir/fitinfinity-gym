"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, CreditCard, UserCog, RefreshCw, UserPlus, TrendingUp, Dumbbell, UsersRound, ArrowLeftRight } from "lucide-react";
import { api } from "@/trpc/react";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DashboardPage: React.FC = () => {
  // Get current month date range
  const getCurrentMonthDates = (): { start: string; end: string } => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startStr = firstDay.toISOString().split('T')[0] as string;
    const endStr = lastDay.toISOString().split('T')[0] as string;
    return {
      start: startStr,
      end: endStr
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

  // Query for frozen subscriptions count
  const { data: frozenSubsData, isLoading: frozenSubsLoading } =
    api.subs.count.useQuery({
      where: {
        isFrozen: true,
        deletedAt: null,
      },
    });

  // Query for freeze operations with date range
  const { data: freezeStatsData, isLoading: freezeStatsLoading } =
    api.subs.getFreezeStats.useQuery(
      {
        startDate: appliedStartDate,
        endDate: appliedEndDate,
      },
      {
        enabled: !!appliedStartDate && !!appliedEndDate,
      }
    );

  // Query POS sales with date range
  const { data: posSalesData, isLoading: posSalesLoading } =
    api.finance.getPosSales.useQuery(
      {
        startDate: appliedStartDate,
        endDate: appliedEndDate,
      },
      {
        enabled: !!appliedStartDate && !!appliedEndDate,
      }
    );

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

  // Query transfer statistics with date range
  const { data: transferStats, isLoading: transferStatsLoading } =
    api.subs.getTransferStats.useQuery(
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
      member.subscriptions.some((sub) => sub.isActive && !sub.isFrozen)
    ).length ?? 0;
  const totalFrozenSubscriptions = frozenSubsData ?? 0;
  const posSalesTotal = posSalesData?.total ?? 0;
  const posSalesCount = posSalesData?.count ?? 0;
  const freezePeriodCount = freezeStatsData?.freezeCount ?? 0;
  const freezeRevenue = freezeStatsData?.totalRevenue ?? 0;

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
              <div className="rounded-full bg-amber-500/20 p-3">
                <UserCog className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Frozen Subscriptions</p>
                <h2 className="text-2xl font-bold">
                  {frozenSubsLoading ? "..." : totalFrozenSubscriptions}
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
                  Total Sales POS
                </p>
                <h2 className="text-2xl font-bold">
                  {posSalesLoading ? "..." : formatRupiah(posSalesTotal)}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {posSalesLoading ? "..." : `${posSalesCount} transactions`}
                </p>
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
                  <p className="text-sm text-muted-foreground">Active Subscription (Non-Frozen)</p>
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

        {/* Total Sales Summary */}
       

        {/* Subscription Type Breakdown */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Subscription Sales by Type</h3>
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

        {/* Total Revenue Row - 3 Columns */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Freeze Period Stats */}
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-500/20 p-4">
                <RefreshCw className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">Total Freeze Period</p>
                <h2 className="text-3xl font-bold text-blue-700">
                  {freezeStatsLoading ? "..." : freezePeriodCount}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Revenue: {freezeStatsLoading ? "..." : formatRupiah(freezeRevenue)}
                </p>
              </div>
            </div>
          </Card>

          {/* Transfer Period Stats */}
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-violet-500/20 p-4">
                <ArrowLeftRight className="h-8 w-8 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">Total Transfer Period</p>
                <h2 className="text-3xl font-bold text-violet-700">
                  {transferStatsLoading ? "..." : transferStats?.totalTransfers ?? 0}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Revenue: {transferStatsLoading ? "..." : formatRupiah(transferStats?.totalRevenue ?? 0)}
                </p>
              </div>
            </div>
          </Card>

          {/* Total Subscription Revenue */}
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-500/20 p-4">
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">Total Revenue (All Subscriptions)</p>
                <h2 className="text-3xl font-bold text-green-700">
                  {statsLoading ? "..." : formatRupiah(
                    (dashboardStats?.subscriptionTypeBreakdown.MEMBERSHIP.revenue ?? 0) +
                    (dashboardStats?.subscriptionTypeBreakdown.PERSONAL_TRAINER.revenue ?? 0) +
                    (dashboardStats?.subscriptionTypeBreakdown.GROUP_TRAINER.revenue ?? 0)
                  )}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Subscriptions: {statsLoading ? "..." :
                    (dashboardStats?.subscriptionTypeBreakdown.MEMBERSHIP.count ?? 0) +
                    (dashboardStats?.subscriptionTypeBreakdown.PERSONAL_TRAINER.count ?? 0) +
                    (dashboardStats?.subscriptionTypeBreakdown.GROUP_TRAINER.count ?? 0)
                  }
                </p>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage;
