"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { format, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Mic, Users, Ban, CheckCircle, ChevronDown, ChevronRight, Loader2, XCircle, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

const formatRupiah = (amount: number) =>
  "Rp" + amount.toLocaleString("id-ID");

export default function InstructorReportPage() {
  const [startDate, setStartDate] = useState<string>(
    format(subDays(new Date(), 30), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [appliedStart, setAppliedStart] = useState<Date>(subDays(new Date(), 30));
  const [appliedEnd, setAppliedEnd] = useState<Date>(new Date());
  const [selectedInstructor, setSelectedInstructor] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "SCHEDULED" | "CANCELLED">("all");
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

  // Fetch active instructors for filter
  const { data: instructorList = [] } = api.instructor.getActive.useQuery();

  // Fetch report
  const { data: report, isLoading } = api.instructor.report.useQuery({
    startDate: appliedStart,
    endDate: appliedEnd,
    instructorId: selectedInstructor !== "all" ? selectedInstructor : undefined,
    status: selectedStatus,
  });

  const summary = report?.summary;
  const instructors = report?.instructors ?? [];

  return (
    <ProtectedRoute requiredPermissions={["report:instructor"]}>
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <div>
          <h1 className="text-2xl font-bold">Instructor Report</h1>
          <p className="text-muted-foreground">
            Laporan performa instructor, jumlah class, pembatalan, dan kehadiran.
          </p>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium">Start</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">End</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs font-medium">Instructor</label>
              <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Instructor</SelectItem>
                  {instructorList.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[160px]">
              <label className="mb-1 block text-xs font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="SCHEDULED">Aktif</SelectItem>
                  <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleApply}>Apply Filter</Button>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-teal-500/20 p-2">
                <Mic className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Instructor</p>
                <p className="text-xl font-bold">
                  {isLoading ? <Skeleton className="h-7 w-10" /> : summary?.uniqueInstructors ?? 0}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-500/20 p-2">
                <CheckCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Class</p>
                <p className="text-xl font-bold">
                  {isLoading ? <Skeleton className="h-7 w-10" /> : summary?.totalClasses ?? 0}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-500/20 p-2">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dibatalkan</p>
                <p className="text-xl font-bold">
                  {isLoading ? <Skeleton className="h-7 w-10" /> : summary?.cancelledClasses ?? 0}
                </p>
                {summary && summary.cancelledClasses > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Sesi dihitung: {summary.cancelledSessionCounted} · Tidak: {summary.cancelledSessionNotCounted}
                  </p>
                )}
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-500/20 p-2">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Peserta</p>
                <p className="text-xl font-bold">
                  {isLoading ? <Skeleton className="h-7 w-10" /> : summary?.totalStudents ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Hadir: {summary?.totalAttended ?? 0}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-500/20 p-2">
                <DollarSign className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-lg font-bold">
                  {isLoading ? <Skeleton className="h-7 w-24" /> : formatRupiah(summary?.totalRevenue ?? 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Instructor Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detail per Instructor</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading report...</span>
              </div>
            ) : instructors.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Tidak ada data untuk periode ini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Instructor</TableHead>
                      <TableHead className="text-center">Total Class</TableHead>
                      <TableHead className="text-center">Aktif</TableHead>
                      <TableHead className="text-center">Dibatalkan</TableHead>
                      <TableHead className="text-center">Sesi Dihitung</TableHead>
                      <TableHead className="text-center">Sesi Tidak Dihitung</TableHead>
                      <TableHead className="text-center">Peserta</TableHead>
                      <TableHead className="text-center">Hadir</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instructors.map((inst) => {
                      const key = inst.instructorId || inst.instructorName;
                      const isExpanded = expandedRows.has(key);
                      return (
                        <>
                          <TableRow
                            key={key}
                            className="cursor-pointer hover:bg-accent"
                            onClick={() => toggleRow(key)}
                          >
                            <TableCell>
                              {inst.classes.length > 0 ? (
                                isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                              ) : null}
                            </TableCell>
                            <TableCell className="font-medium">{inst.instructorName}</TableCell>
                            <TableCell className="text-center font-semibold">{inst.totalClasses}</TableCell>
                            <TableCell className="text-center">{inst.scheduledClasses}</TableCell>
                            <TableCell className="text-center">
                              {inst.cancelledClasses > 0 ? (
                                <Badge variant="destructive" className="text-xs">{inst.cancelledClasses}</Badge>
                              ) : (
                                "0"
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {inst.cancelledSessionCounted > 0 ? (
                                <span className="text-orange-500 font-semibold">{inst.cancelledSessionCounted}</span>
                              ) : "0"}
                            </TableCell>
                            <TableCell className="text-center">
                              {inst.cancelledSessionNotCounted > 0 ? (
                                <span className="text-red-500 font-semibold">{inst.cancelledSessionNotCounted}</span>
                              ) : "0"}
                            </TableCell>
                            <TableCell className="text-center">{inst.totalStudents}</TableCell>
                            <TableCell className="text-center">{inst.totalAttended}</TableCell>
                            <TableCell className="text-right text-sm">{formatRupiah(inst.totalRevenue)}</TableCell>
                          </TableRow>

                          {/* Expanded class details */}
                          {isExpanded && inst.classes.length > 0 && (
                            <TableRow key={`${key}-detail`}>
                              <TableCell colSpan={10} className="bg-muted/30 p-0">
                                <div className="px-8 py-3">
                                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                                    Detail Class ({inst.classes.length})
                                  </p>
                                  <div className="space-y-1">
                                    {inst.classes.map((cls: any) => (
                                      <div
                                        key={cls.id}
                                        className="flex flex-wrap items-center gap-4 border-b border-border/50 py-1.5 text-xs last:border-0"
                                      >
                                        <span className="w-28 font-medium">{cls.name}</span>
                                        <span className="text-muted-foreground">
                                          {format(new Date(cls.schedule), "dd MMM yyyy HH:mm", { locale: localeId })}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {cls.duration} menit
                                        </span>
                                        <span className="text-muted-foreground">
                                          {cls.registeredMembers?.length ?? 0} peserta
                                        </span>
                                        <span className="text-muted-foreground">
                                          {formatRupiah(cls.price)}
                                        </span>
                                        {cls.status === "CANCELLED" ? (
                                          <Badge variant="destructive" className="text-[10px]">
                                            <Ban className="mr-1 h-3 w-3" />
                                            Dibatalkan
                                            {cls.sessionCounted ? " (sesi dihitung)" : " (sesi tdk dihitung)"}
                                          </Badge>
                                        ) : (
                                          <Badge className="bg-green-600 text-[10px]">Aktif</Badge>
                                        )}
                                        {cls.cancelReason && (
                                          <span className="text-muted-foreground italic">
                                            Alasan: {cls.cancelReason}
                                          </span>
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
