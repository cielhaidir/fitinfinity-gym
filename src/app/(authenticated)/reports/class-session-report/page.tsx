"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { format, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { BookOpen, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

const formatRupiah = (amount: number) =>
  "Rp" + amount.toLocaleString("id-ID");

export default function ClassSessionReportPage() {
  const [startDate, setStartDate] = useState<string>(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [appliedStart, setAppliedStart] = useState<Date>(subDays(new Date(), 30));
  const [appliedEnd, setAppliedEnd] = useState<Date>(new Date());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const handleApply = () => {
    setAppliedStart(new Date(startDate));
    setAppliedEnd(new Date(endDate));
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Stats
  const { data: stats, isLoading: statsLoading } =
    api.memberClass.getClassSessionStats.useQuery({
      startDate: appliedStart,
      endDate: appliedEnd,
    });

  // Report
  const { data: report, isLoading: reportLoading } =
    api.memberClass.getClassSessionReport.useQuery({
      startDate: appliedStart,
      endDate: appliedEnd,
    });

  return (
    <ProtectedRoute requiredPermissions={["report:class-session"]}>
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <div>
          <h1 className="text-2xl font-bold">Class Session Report</h1>
          <p className="text-muted-foreground">
            Laporan penggunaan sesi class per member.
          </p>
        </div>

        {/* Date Filter */}
        <Card className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">Start:</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">End:</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <Button onClick={handleApply}>Apply Filter</Button>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-teal-500/20 p-3">
                <BookOpen className="h-6 w-6 text-teal-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <h2 className="text-2xl font-bold">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.activeSubscriptions ?? 0}
                </h2>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-500/20 p-3">
                <BookOpen className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <h2 className="text-2xl font-bold">
                  {statsLoading ? <Skeleton className="h-8 w-32" /> : formatRupiah(stats?.totalRevenue ?? 0)}
                </h2>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-500/20 p-3">
                <BookOpen className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <h2 className="text-2xl font-bold">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.totalTransactions ?? 0}
                </h2>
              </div>
            </div>
          </Card>
        </div>

        {/* Report Table */}
        <Card>
          <CardHeader>
            <CardTitle>Class Session Usage per Member</CardTitle>
          </CardHeader>
          <CardContent>
            {reportLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading report...</span>
              </div>
            ) : !report || report.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Tidak ada data class session.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead className="text-center">Sesi Terpakai</TableHead>
                      <TableHead className="text-center">Sisa Sesi</TableHead>
                      <TableHead className="text-center">Total Sesi</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Berlaku</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.map((row) => {
                      const isExpanded = expandedRows.has(row.subscriptionId);
                      return (
                        <>
                          <TableRow
                            key={row.subscriptionId}
                            className="cursor-pointer hover:bg-accent"
                            onClick={() => toggleRow(row.subscriptionId)}
                          >
                            <TableCell>
                              {row.classHistory.length > 0 ? (
                                isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{row.memberName}</p>
                                <p className="text-xs text-muted-foreground">{row.memberEmail}</p>
                              </div>
                            </TableCell>
                            <TableCell>{row.packageName}</TableCell>
                            <TableCell className="text-center font-semibold">
                              {row.usedSessions}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {row.remainingSessions}
                            </TableCell>
                            <TableCell className="text-center">
                              {row.totalSessions}
                            </TableCell>
                            <TableCell>
                              {row.isActive ? (
                                <Badge className="bg-green-600">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(row.startDate), "dd MMM yyyy", { locale: localeId })}
                              {row.endDate && (
                                <> — {format(new Date(row.endDate), "dd MMM yyyy", { locale: localeId })}</>
                              )}
                            </TableCell>
                          </TableRow>

                          {/* Expanded: class history */}
                          {isExpanded && row.classHistory.length > 0 && (
                            <TableRow key={`${row.subscriptionId}-detail`}>
                              <TableCell colSpan={8} className="bg-muted/30 p-0">
                                <div className="px-8 py-3">
                                  <p className="text-xs font-semibold mb-2 text-muted-foreground">
                                    Riwayat Class ({row.classHistory.length})
                                  </p>
                                  <div className="space-y-1">
                                    {row.classHistory.map((ch, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-4 text-xs py-1 border-b border-border/50 last:border-0"
                                      >
                                        <span className="w-32 font-medium">{ch.className}</span>
                                        <span className="text-muted-foreground">
                                          {ch.schedule
                                            ? format(new Date(ch.schedule), "dd MMM yyyy HH:mm", { locale: localeId })
                                            : "-"}
                                        </span>
                                        <span className="text-muted-foreground">
                                          Instruktur: {ch.instructor}
                                        </span>
                                        {ch.attendedAt && (
                                          <Badge variant="outline" className="text-[10px]">
                                            Hadir {format(new Date(ch.attendedAt), "HH:mm", { locale: localeId })}
                                          </Badge>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
