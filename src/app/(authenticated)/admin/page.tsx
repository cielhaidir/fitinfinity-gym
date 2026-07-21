"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, CreditCard, UserCog, RefreshCw, UserPlus, TrendingUp, Dumbbell, UsersRound, ArrowLeftRight, BookOpen } from "lucide-react";
import { api } from "@/trpc/react";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { format, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

  // Query transfer statistics with date range
  const { data: chartData, isLoading: chartLoading } =
    api.subs.getChartData.useQuery({ months: 6 });

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
              <p className="mb-4 text-sm font-semibold text-muted-foreground">Revenue per Bulan (Rp)</p>
              {chartLoading ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">Memuat...</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData?.monthlyRevenue ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
              <p className="mb-4 text-sm font-semibold text-muted-foreground">Member Baru per Bulan</p>
              {chartLoading ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">Memuat...</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData?.monthlyNewMembers ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [v, "Member Baru"]} />
                    <Line type="monotone" dataKey="members" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
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

          </div>
        </div>

      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage;
