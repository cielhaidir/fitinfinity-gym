"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Users, CreditCard, UserCog, RefreshCw, UserPlus, TrendingUp, Dumbbell, UsersRound, ArrowLeftRight, BookOpen, Ticket } from "lucide-react";
import { api } from "@/trpc/react";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { format, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const DashboardPage: React.FC = () => {
  // Get current month date range
  const toLocalDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getCurrentMonthDates = (): { start: string; end: string } => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start: toLocalDateString(firstDay),
      end: toLocalDateString(now),
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

  // New members chart: range selector (months) + drill-down popup state
  const [chartMonths, setChartMonths] = useState<number>(6);
  const [selectedMonth, setSelectedMonth] = useState<
    { year: number; monthIndex: number; label: string } | null
  >(null);

  // Monthly trend chart data (new members, package distribution)
  const { data: chartData, isLoading: chartLoading } =
    api.subs.getChartData.useQuery({ months: chartMonths });

  // Retention / renewal chart uses its own independent month range
  const [retentionMonths, setRetentionMonths] = useState<number>(6);
  const { data: retentionData, isLoading: retentionLoading } =
    api.subs.getRetentionByMonth.useQuery({ months: retentionMonths });

  // True retention (expiry-based) chart: own month range + grace period
  const [trueRetMonths, setTrueRetMonths] = useState<number>(6);
  const [graceDays, setGraceDays] = useState<number>(45);
  const { data: trueRetData, isLoading: trueRetLoading } =
    api.subs.getTrueRetentionByMonth.useQuery({ months: trueRetMonths, graceDays });

  // Churn drill-down popup (members who did not renew in the clicked month)
  const [selectedChurnMonth, setSelectedChurnMonth] = useState<
    { year: number; monthIndex: number; label: string } | null
  >(null);
  const { data: churnedDetail, isLoading: churnedLoading } =
    api.subs.getChurnedMembersByMonth.useQuery(
      {
        year: selectedChurnMonth?.year ?? 0,
        month: selectedChurnMonth?.monthIndex ?? 0,
        graceDays,
      },
      { enabled: !!selectedChurnMonth },
    );

  // Revenue chart uses its own independent month range
  const [revenueMonths, setRevenueMonths] = useState<number>(6);
  const { data: revenueChart, isLoading: revenueLoading } =
    api.subs.getChartData.useQuery({ months: revenueMonths });

  // Drill-down: new members for the clicked month
  const { data: newMembersDetail, isLoading: newMembersLoading } =
    api.subs.getNewMembersByMonth.useQuery(
      { year: selectedMonth?.year ?? 0, month: selectedMonth?.monthIndex ?? 0 },
      { enabled: !!selectedMonth },
    );

  // Sales filter inside the drill-down popup
  const [salesFilter, setSalesFilter] = useState<string>("all");
  useEffect(() => {
    setSalesFilter("all");
  }, [selectedMonth]);

  // Group by sales NAME (not id) so the same person recorded under multiple
  // sales records (e.g. both PersonalTrainer & FC) is not duplicated, and all
  // members without a resolvable sales collapse into one "Tanpa Sales" option.
  const salesOptions = useMemo(() => {
    const names = new Set<string>();
    (newMembersDetail ?? []).forEach((m) => names.add(m.salesName || "-"));
    return Array.from(names).sort((a, b) =>
      a === "-" ? 1 : b === "-" ? -1 : a.localeCompare(b),
    );
  }, [newMembersDetail]);

  const filteredNewMembers = useMemo(() => {
    const rows = newMembersDetail ?? [];
    if (salesFilter === "all") return rows;
    return rows.filter((m) => (m.salesName || "-") === salesFilter);
  }, [newMembersDetail, salesFilter]);

  // Sales performance chart (revenue per sales/PT) + drill-down popup.
  // Uses an independent date range (default: last 6 months).
  const [salesStart, setSalesStart] = useState<string>(() =>
    toLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)),
  );
  const [salesEnd, setSalesEnd] = useState<string>(() => toLocalDateString(new Date()));
  const [selectedSales, setSelectedSales] = useState<
    { userId: string; name: string; salesIds: string[] } | null
  >(null);

  const salesRange = useMemo(
    () => ({
      startDate: new Date(`${salesStart}T00:00:00`),
      endDate: new Date(`${salesEnd}T23:59:59.999`),
    }),
    [salesStart, salesEnd],
  );
  const salesRangeValid = !!salesStart && !!salesEnd && salesRange.startDate <= salesRange.endDate;

  const { data: salesPerf, isLoading: salesPerfLoading } =
    api.subs.getSalesPerformance.useQuery(salesRange, { enabled: salesRangeValid });

  const { data: salesDetail, isLoading: salesDetailLoading } =
    api.subs.getSalesDetail.useQuery(
      { salesIds: selectedSales?.salesIds ?? [], ...salesRange },
      { enabled: !!selectedSales && (selectedSales?.salesIds.length ?? 0) > 0 && salesRangeValid },
    );

  const salesChartData = useMemo(() => (salesPerf ?? []).slice(0, 20), [salesPerf]);
  const salesDetailTotal = useMemo(
    () => (salesDetail ?? []).reduce((sum, r) => sum + Number(r.amount), 0),
    [salesDetail],
  );

  const { data: expiringData, isLoading: expiringLoading, refetch: refetchExpiring } =
    api.subs.getExpiringSubscriptions.useQuery({ days: 7 });

  const sendReminderMutation = api.subs.sendExpiryReminderForSub.useMutation({
    onSuccess: (data) => {
      toast.success(`Email terkirim ke ${data.sentTo}`);
      void refetchExpiring();
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: unfrozenData, isLoading: unfrozenLoading, refetch: refetchUnfrozen } =
    api.subs.getUnfrozenToday.useQuery();

  const [sentUnfreezeIds, setSentUnfreezeIds] = React.useState<Set<string>>(new Set());

  const sendUnfreezeMutation = api.subs.sendUnfreezeNotification.useMutation({
    onSuccess: (data, variables) => {
      toast.success(`Email terkirim ke ${data.sentTo}`);
      setSentUnfreezeIds((prev) => new Set(prev).add(variables.freezeOperationId));
      void refetchUnfrozen();
    },
    onError: (err) => toast.error(err.message),
  });

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

  // Class visit stats (paid/free count + revenue) for the selected range
  const { data: classVisitStats, isLoading: classVisitLoading } =
    api.classVisit.revenueSummary.useQuery(
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-teal-500/20 p-3">
                  <BookOpen className="h-6 w-6 text-teal-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Class Session</p>
                  <h2 className="text-2xl font-bold">
                    {statsLoading ? "..." : dashboardStats?.subscriptionTypeBreakdown.CLASS_SESSION.count ?? 0}
                  </h2>
                  <p className="text-sm font-medium text-teal-600">
                    {statsLoading ? "..." : formatRupiah(dashboardStats?.subscriptionTypeBreakdown.CLASS_SESSION.revenue ?? 0)}
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
                    (dashboardStats?.subscriptionTypeBreakdown.GROUP_TRAINER.revenue ?? 0) +
                    (dashboardStats?.subscriptionTypeBreakdown.CLASS_SESSION.revenue ?? 0)
                  )}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Subscriptions: {statsLoading ? "..." :
                    (dashboardStats?.subscriptionTypeBreakdown.MEMBERSHIP.count ?? 0) +
                    (dashboardStats?.subscriptionTypeBreakdown.PERSONAL_TRAINER.count ?? 0) +
                    (dashboardStats?.subscriptionTypeBreakdown.GROUP_TRAINER.count ?? 0) +
                    (dashboardStats?.subscriptionTypeBreakdown.CLASS_SESSION.count ?? 0)
                  }
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Class Visit Stats */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Class Visit</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-indigo-500/20 p-4">
                  <Ticket className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium">Class Visit Berbayar</p>
                  <h2 className="text-3xl font-bold text-indigo-700">
                    {classVisitLoading ? "..." : classVisitStats?.totalPaidVisits ?? 0}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nominal: {classVisitLoading ? "..." : formatRupiah(classVisitStats?.totalRevenue ?? 0)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-purple-500/20 p-4">
                  <BookOpen className="h-8 w-8 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium">Class Visit Gratis</p>
                  <h2 className="text-3xl font-bold text-purple-700">
                    {classVisitLoading ? "..." : classVisitStats?.totalFreeVisits ?? 0}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ditanggung membership / paket sesi
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-green-500/20 p-4">
                  <CreditCard className="h-8 w-8 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium">Total Class Visit</p>
                  <h2 className="text-3xl font-bold text-green-700">
                    {classVisitLoading
                      ? "..."
                      : (classVisitStats?.totalPaidVisits ?? 0) + (classVisitStats?.totalFreeVisits ?? 0)}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Berbayar + gratis pada rentang ini
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* ── Expiring Subscriptions ── */}
        <div>
          {/* Reusable expiring table renderer */}
          {(() => {
            const gymSubs = expiringData?.filter((s) => (s as any).package?.type === "GYM_MEMBERSHIP") ?? [];
            const ptSubs = expiringData?.filter((s) => (s as any).package?.type !== "GYM_MEMBERSHIP") ?? [];

            const renderTable = (subs: typeof gymSubs, emptyMsg: string) => (
              <Card className="overflow-hidden">
                {expiringLoading ? (
                  <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">Memuat...</div>
                ) : !subs.length ? (
                  <div className="flex h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {emptyMsg}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    <div className="grid grid-cols-12 gap-3 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
                      <div className="col-span-2">Member</div>
                      <div className="col-span-2">Email</div>
                      <div className="col-span-2">Paket</div>
                      <div className="col-span-1">PT</div>
                      <div className="col-span-2">Sales</div>
                      <div className="col-span-1">Expired</div>
                      <div className="col-span-1">Sisa</div>
                      <div className="col-span-1 text-center">Kirim</div>
                    </div>
                    {subs.map((sub) => {
                      const daysLeft = sub.endDate ? differenceInDays(new Date(sub.endDate), new Date()) : 0;
                      const alreadySent = sub.isReminder && (sub.reminderStage ?? 0) >= 1;
                      const isSending = sendReminderMutation.isPending &&
                        sendReminderMutation.variables?.subscriptionId === sub.id;
                      return (
                        <div key={sub.id} className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm hover:bg-muted/30">
                          <div className="col-span-2 font-medium truncate">{sub.member?.user?.name ?? "-"}</div>
                          <div className="col-span-2 text-muted-foreground truncate text-xs">{sub.member?.user?.email ?? "-"}</div>
                          <div className="col-span-2 truncate text-xs">{sub.package?.name ?? "-"}</div>
                          <div className="col-span-1 truncate text-xs">
                            {(sub as any).trainerName ?? <span className="text-muted-foreground">-</span>}
                          </div>
                          <div className="col-span-2 truncate text-xs">
                            {(sub as any).salesName
                              ? <span>{(sub as any).salesName} <span className="text-muted-foreground">({sub.salesType === "FC" ? "FC" : "PT"})</span></span>
                              : <span className="text-muted-foreground">-</span>}
                          </div>
                          <div className="col-span-1 text-xs">
                            {sub.endDate ? format(new Date(sub.endDate), "d MMM yy", { locale: localeId }) : "-"}
                          </div>
                          <div className="col-span-1">
                            <Badge variant={daysLeft <= 2 ? "destructive" : "secondary"} className="text-xs">
                              {daysLeft}h
                            </Badge>
                          </div>
                          <div className="col-span-1 flex justify-center">
                            {alreadySent ? (
                              <span title={`Terkirim: ${sub.reminderAt ? format(new Date(sub.reminderAt), "d MMM") : ""}`}>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              </span>
                            ) : (
                              <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isSending}
                                onClick={() => sendReminderMutation.mutate({ subscriptionId: sub.id })}
                                title="Kirim email reminder">
                                {isSending
                                  ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                  : <Mail className="h-4 w-4 text-blue-500" />}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );

            return (
              <>
                {/* Membership */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Membership Akan Expired (7 Hari)</h3>
                      <p className="text-sm text-muted-foreground">
                        {expiringLoading ? "Memuat..." : `${gymSubs.length} membership akan expired`}
                      </p>
                    </div>
                  </div>
                  {renderTable(gymSubs, "Tidak ada membership yang akan expired dalam 7 hari")}
                </div>

                {/* PT & Group Training */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Paket PT / Group Training Akan Expired (7 Hari)</h3>
                      <p className="text-sm text-muted-foreground">
                        {expiringLoading ? "Memuat..." : `${ptSubs.length} paket akan expired`}
                      </p>
                    </div>
                  </div>
                  {renderTable(ptSubs, "Tidak ada paket PT / Group Training yang akan expired dalam 7 hari")}
                </div>
              </>
            );
          })()}
        </div>

        {/* ── Unfrozen Today ── */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Membership Aktif Kembali Hari Ini</h3>
              <p className="text-sm text-muted-foreground">
                {unfrozenLoading ? "Memuat..." : `${unfrozenData?.length ?? 0} membership ter-unfreeze hari ini`}
              </p>
            </div>
          </div>
          <Card className="overflow-hidden">
            {unfrozenLoading ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">Memuat...</div>
            ) : !unfrozenData?.length ? (
              <div className="flex h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                Tidak ada membership yang ter-unfreeze hari ini
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* Header */}
                <div className="grid grid-cols-12 gap-3 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
                  <div className="col-span-2">Member</div>
                  <div className="col-span-2">Email</div>
                  <div className="col-span-4">Paket Aktif Kembali</div>
                  <div className="col-span-2">Exp Date</div>
                  <div className="col-span-1 text-center">Freeze</div>
                  <div className="col-span-1 text-center">Kirim</div>
                </div>
                {unfrozenData.map((member) => {
                  const isSending = sendUnfreezeMutation.isPending &&
                    sendUnfreezeMutation.variables?.freezeOperationId === member.latestOpId;
                  const alreadySent = sentUnfreezeIds.has(member.latestOpId);
                  return (
                    <div key={member.memberId} className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm hover:bg-muted/30">
                      <div className="col-span-2 font-medium truncate">
                        {member.memberName}
                      </div>
                      <div className="col-span-2 truncate text-xs text-muted-foreground">
                        {member.memberEmail}
                      </div>
                      <div className="col-span-4 flex flex-wrap gap-1">
                        {member.packages.length > 0
                          ? member.packages.map((pkg, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {pkg.name}
                              </Badge>
                            ))
                          : <span className="text-xs text-muted-foreground">-</span>
                        }
                      </div>
                      <div className="col-span-2 text-xs text-muted-foreground">
                        {member.packages.length === 1 && member.packages[0]?.endDate
                          ? format(new Date(member.packages[0].endDate), "d MMM yyyy", { locale: localeId })
                          : member.packages.length > 1
                            ? <div className="flex flex-col gap-0.5">
                                {member.packages.map((pkg, i) => (
                                  <span key={i}>
                                    {pkg.endDate ? format(new Date(pkg.endDate), "d MMM yy", { locale: localeId }) : "-"}
                                  </span>
                                ))}
                              </div>
                            : "-"}
                      </div>
                      <div className="col-span-1 text-center">
                        <Badge variant="outline" className="text-xs">
                          {member.totalFreezeDays}h
                        </Badge>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {alreadySent ? (
                          <span title="Notifikasi terkirim">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          </span>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            disabled={isSending}
                            onClick={() => sendUnfreezeMutation.mutate({ freezeOperationId: member.latestOpId })}
                            title="Kirim notifikasi unfreeze"
                          >
                            {isSending
                              ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              : <Mail className="h-4 w-4 text-green-500" />
                            }
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ── Charts Section ── */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Tren & Distribusi</h3>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Revenue Bar Chart */}
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-muted-foreground">Revenue per Bulan (Rp)</p>
                <select
                  value={revenueMonths}
                  onChange={(e) => setRevenueMonths(Number(e.target.value))}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value={1}>1 bulan</option>
                  <option value={3}>3 bulan</option>
                  <option value={6}>6 bulan</option>
                  <option value={12}>12 bulan (1 tahun)</option>
                  <option value={18}>18 bulan</option>
                  <option value={24}>24 bulan (2 tahun)</option>
                </select>
              </div>
              {revenueLoading ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">Memuat...</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={revenueChart?.monthlyRevenue ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`Rp ${v.toLocaleString("id-ID")}`, "Revenue"]} />
                    <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* New Members Line Chart */}
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-muted-foreground">Member Baru per Bulan</p>
                <select
                  value={chartMonths}
                  onChange={(e) => setChartMonths(Number(e.target.value))}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value={1}>1 bulan</option>
                  <option value={3}>3 bulan</option>
                  <option value={6}>6 bulan</option>
                  <option value={12}>12 bulan (1 tahun)</option>
                  <option value={18}>18 bulan</option>
                  <option value={24}>24 bulan (2 tahun)</option>
                </select>
              </div>
              {chartLoading ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">Memuat...</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                      data={chartData?.monthlyNewMembers ?? []}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                      accessibilityLayer={false}
                      onClick={(state: any) => {
                        const data = chartData?.monthlyNewMembers;
                        if (!data) return;
                        // recharts v3 returns activeTooltipIndex as a string
                        const idx = Number(state?.activeTooltipIndex);
                        const p =
                          Number.isInteger(idx) && idx >= 0 && idx < data.length
                            ? data[idx]
                            : state?.activePayload?.[0]?.payload;
                        if (p && typeof p.year === "number" && typeof p.monthIndex === "number") {
                          setSelectedMonth({ year: p.year, monthIndex: p.monthIndex, label: p.month });
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v, "Member Baru"]} />
                      <Line
                        type="monotone"
                        dataKey="members"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={(props: any) => {
                          const { cx, cy, payload, index } = props;
                          if (cx == null || cy == null) return <g key={index} />;
                          return (
                            <g
                              key={index}
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                if (payload)
                                  setSelectedMonth({
                                    year: payload.year,
                                    monthIndex: payload.monthIndex,
                                    label: payload.month,
                                  });
                              }}
                            >
                              {/* transparent larger hit-area for easier clicking */}
                              <circle cx={cx} cy={cy} r={14} fill="transparent" />
                              <circle
                                cx={cx}
                                cy={cy}
                                r={5}
                                fill="#10b981"
                                stroke="#fff"
                                strokeWidth={2}
                              />
                            </g>
                          );
                        }}
                        activeDot={{ r: 7, cursor: "pointer" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Klik titik pada grafik untuk melihat daftar member barunya
                  </p>
                </>
              )}
            </Card>

            {/* Retention / Renewal Rate Chart */}
            <Card className="p-6 lg:col-span-2">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-muted-foreground">Retensi / Renewal Rate per Bulan</p>
                <select
                  value={retentionMonths}
                  onChange={(e) => setRetentionMonths(Number(e.target.value))}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value={3}>3 bulan</option>
                  <option value={6}>6 bulan</option>
                  <option value={12}>12 bulan</option>
                  <option value={24}>24 bulan</option>
                </select>
              </div>
              <p className="mb-4 text-[11px] text-muted-foreground">
                Renewal rate = perpanjangan ÷ (member baru + perpanjangan) per bulan, berdasarkan tanggal mulai subscription GYM.
              </p>
              {retentionLoading ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">Memuat...</div>
              ) : (retentionData ?? []).length === 0 ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">Belum ada data.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart
                    data={retentionData ?? []}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      unit="%"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === "Renewal Rate" ? [`${value}%`, name] : [value, name]
                      }
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="newMembers" name="Member Baru" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="renewals" name="Perpanjangan" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="renewalRate"
                      name="Renewal Rate"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* True Retention (expiry-based) Chart */}
            <Card className="p-6 lg:col-span-2">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-muted-foreground">Retensi Member (berdasarkan Expiry)</p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-[11px] text-muted-foreground">Masa tenggang</label>
                  <select
                    value={graceDays}
                    onChange={(e) => setGraceDays(Number(e.target.value))}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                  >
                    <option value={0}>0 hari</option>
                    <option value={14}>14 hari</option>
                    <option value={30}>30 hari</option>
                    <option value={45}>45 hari</option>
                    <option value={60}>60 hari</option>
                  </select>
                  <select
                    value={trueRetMonths}
                    onChange={(e) => setTrueRetMonths(Number(e.target.value))}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                  >
                    <option value={3}>3 bulan</option>
                    <option value={6}>6 bulan</option>
                    <option value={12}>12 bulan</option>
                    <option value={24}>24 bulan</option>
                  </select>
                </div>
              </div>
              <p className="mb-4 text-[11px] text-muted-foreground">
                Aliran per bulan: <strong>Perpanjangan</strong> = subscription perpanjangan yang <strong>mulai</strong> bulan itu (cocok dengan grafik atas).
                <strong> Berhenti</strong> = subscription yang <strong>berakhir</strong> bulan itu &amp; tidak diperpanjang dalam masa tenggang.
                Retention rate = perpanjangan ÷ (perpanjangan + berhenti).
              </p>
              {trueRetLoading ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">Memuat...</div>
              ) : (trueRetData ?? []).length === 0 ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">Belum ada data.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart
                    data={trueRetData ?? []}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    accessibilityLayer={false}
                    style={{ cursor: "pointer" }}
                    onClick={(state: any) => {
                      const data = trueRetData;
                      if (!data) return;
                      const idx = Number(state?.activeTooltipIndex);
                      const p =
                        Number.isInteger(idx) && idx >= 0 && idx < data.length
                          ? data[idx]
                          : state?.activePayload?.[0]?.payload;
                      if (p && typeof p.year === "number" && typeof p.monthIndex === "number") {
                        setSelectedChurnMonth({ year: p.year, monthIndex: p.monthIndex, label: p.month });
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      unit="%"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === "Retention Rate" ? [`${value}%`, name] : [value, name]
                      }
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="retained" name="Perpanjangan" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="churned" name="Berhenti" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="retentionRate"
                      name="Retention Rate"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              {!trueRetLoading && (trueRetData ?? []).length > 0 && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Klik salah satu bulan untuk melihat daftar member yang berhenti (untuk di-follow up)
                </p>
              )}
            </Card>

            {/* Package Distribution Donut */}
            <Card className="p-6 lg:col-span-2">
              <p className="mb-4 text-sm font-semibold text-muted-foreground">Distribusi Paket Aktif</p>
              {chartLoading ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">Memuat...</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={chartData?.packageDistribution ?? []}
                      dataKey="count"
                      nameKey="type"
                      cx="50%" cy="50%"
                      innerRadius={65} outerRadius={110}
                      paddingAngle={3}
                      label={({ type, percent }: { type: string; percent: number }) =>
                        `${String(type).replace(/_/g, " ")} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {(chartData?.packageDistribution ?? []).map((_, index) => {
                        const COLORS = ["#4f46e5", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];
                        return <Cell key={index} fill={COLORS[index % COLORS.length]} />;
                      })}
                    </Pie>
                    <Tooltip formatter={(v: number, name: string) => [v, String(name).replace(/_/g, " ")]} />
                    <Legend formatter={(v) => String(v).replace(/_/g, " ")} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Sales / PT Revenue Bar Chart */}
            <Card className="p-6 lg:col-span-2">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-muted-foreground">Penjualan per Sales &amp; PT (Top 20)</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    value={salesStart}
                    max={salesEnd}
                    onChange={(e) => setSalesStart(e.target.value)}
                    className="h-8 w-auto text-xs"
                  />
                  <span className="text-xs text-muted-foreground">s/d</span>
                  <Input
                    type="date"
                    value={salesEnd}
                    min={salesStart}
                    onChange={(e) => setSalesEnd(e.target.value)}
                    className="h-8 w-auto text-xs"
                  />
                </div>
              </div>
              {salesPerfLoading ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">Memuat...</div>
              ) : salesChartData.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">Belum ada data penjualan.</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(240, salesChartData.length * 34)}>
                    <BarChart
                      data={salesChartData}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                      accessibilityLayer={false}
                      onClick={(state: any) => {
                        const idx = Number(state?.activeTooltipIndex);
                        const p = Number.isInteger(idx) ? salesChartData[idx] : undefined;
                        if (p) setSelectedSales({ userId: p.userId, name: p.name, salesIds: p.salesIds });
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v: number, _n: string, item: any) => [
                          `Rp ${v.toLocaleString("id-ID")} · ${item?.payload?.count ?? 0} transaksi`,
                          "Penjualan",
                        ]}
                      />
                      <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} cursor="pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Klik batang untuk melihat detail transaksi sales tersebut
                  </p>
                </>
              )}
            </Card>

          </div>
        </div>

        {/* Drill-down popup: new members for the selected month */}
        <Dialog open={!!selectedMonth} onOpenChange={(o) => { if (!o) setSelectedMonth(null); }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Member Baru — {selectedMonth?.label}</DialogTitle>
            </DialogHeader>
            {newMembersLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Memuat...</div>
            ) : !newMembersDetail || newMembersDetail.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Tidak ada member baru pada bulan ini.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Menampilkan <strong>{filteredNewMembers.length}</strong> dari{" "}
                    <strong>{newMembersDetail.length}</strong> member baru (first-timer paket gym).
                  </p>
                  <select
                    value={salesFilter}
                    onChange={(e) => setSalesFilter(e.target.value)}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                  >
                    <option value="all">Semua Sales</option>
                    {salesOptions.map((name) => (
                      <option key={name} value={name}>
                        {name === "-" ? "Tanpa Sales" : name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Nama</th>
                        <th className="px-3 py-2 text-left">Kontak</th>
                        <th className="px-3 py-2 text-left">Paket</th>
                        <th className="px-3 py-2 text-left">Sales</th>
                        <th className="px-3 py-2 text-left">Mulai</th>
                        <th className="px-3 py-2 text-right">Nominal</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredNewMembers.map((m) => (
                        <tr key={m.memberId} className="border-t">
                          <td className="px-3 py-2 font-medium">{m.name}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            <div>{m.email}</div>
                            <div>{m.phone}</div>
                          </td>
                          <td className="px-3 py-2">{m.packageName}</td>
                          <td className="px-3 py-2">{m.salesName}</td>
                          <td className="px-3 py-2 text-xs">
                            {m.startDate
                              ? format(new Date(m.startDate), "dd MMM yyyy", { locale: localeId })
                              : "-"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            Rp {Number(m.amount).toLocaleString("id-ID")}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {m.isActive ? (
                              <Badge className="bg-green-500 text-white">Aktif</Badge>
                            ) : (
                              <Badge variant="secondary">Nonaktif</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Drill-down popup: churned members for the selected expiry month */}
        <Dialog open={!!selectedChurnMonth} onOpenChange={(o) => { if (!o) setSelectedChurnMonth(null); }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Member Berhenti — {selectedChurnMonth?.label}</DialogTitle>
            </DialogHeader>
            {churnedLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Memuat...</div>
            ) : !churnedDetail || churnedDetail.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Tidak ada member yang berhenti pada bulan ini (semua memperpanjang).
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  <strong>{churnedDetail.length}</strong> member berhenti — subscription GYM berakhir bulan ini
                  dan belum memperpanjang dalam masa tenggang {graceDays} hari.
                </p>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Nama</th>
                        <th className="px-3 py-2 text-left">Kontak</th>
                        <th className="px-3 py-2 text-left">Paket</th>
                        <th className="px-3 py-2 text-left">Sales</th>
                        <th className="px-3 py-2 text-left">Berakhir</th>
                        <th className="px-3 py-2 text-center">Sudah Lewat</th>
                        <th className="px-3 py-2 text-right">Nominal Terakhir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {churnedDetail.map((m) => (
                        <tr key={m.memberId} className="border-t">
                          <td className="px-3 py-2 font-medium">{m.name}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            <div>{m.email}</div>
                            <div>{m.phone}</div>
                          </td>
                          <td className="px-3 py-2">{m.packageName}</td>
                          <td className="px-3 py-2">{m.salesName}</td>
                          <td className="px-3 py-2 text-xs">
                            {m.endDate
                              ? format(new Date(m.endDate), "dd MMM yyyy", { locale: localeId })
                              : "-"}
                          </td>
                          <td className="px-3 py-2 text-center text-xs">
                            {m.daysExpired != null ? `${m.daysExpired} hari` : "-"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            Rp {Number(m.amount).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Drill-down popup: transactions for the selected sales/PT */}
        <Dialog open={!!selectedSales} onOpenChange={(o) => { if (!o) setSelectedSales(null); }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Penjualan — {selectedSales?.name}</DialogTitle>
            </DialogHeader>
            {salesDetailLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Memuat...</div>
            ) : !salesDetail || salesDetail.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Tidak ada transaksi pada periode ini.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Total <strong>{salesDetail.length}</strong> transaksi · Omzet{" "}
                  <strong>Rp {salesDetailTotal.toLocaleString("id-ID")}</strong>
                </p>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Tanggal</th>
                        <th className="px-3 py-2 text-left">Member</th>
                        <th className="px-3 py-2 text-left">Paket</th>
                        <th className="px-3 py-2 text-center">Peran</th>
                        <th className="px-3 py-2 text-left">Metode</th>
                        <th className="px-3 py-2 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesDetail.map((t) => (
                        <tr key={t.id} className="border-t">
                          <td className="px-3 py-2 text-xs">
                            {t.date ? format(new Date(t.date), "dd MMM yyyy", { locale: localeId }) : "-"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{t.memberName}</div>
                            <div className="text-xs text-muted-foreground">{t.memberEmail}</div>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {t.packageName}
                            <div className="text-muted-foreground">{String(t.packageType).replace(/_/g, " ")}</div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Badge variant="secondary">{t.salesType === "PersonalTrainer" ? "PT" : t.salesType}</Badge>
                          </td>
                          <td className="px-3 py-2 text-xs">{t.method}</td>
                          <td className="px-3 py-2 text-right">
                            Rp {Number(t.amount).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage;
