"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/trpc/react";
import { format, subDays, endOfDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Calendar, Clock, FileSpreadsheet, Filter, Users, Dumbbell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from "xlsx-js-style";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

const statusBadge = (status: string) => {
  switch (status) {
    case "SCHEDULED": return <Badge variant="outline" className="border-blue-500 text-blue-600">Terjadwal</Badge>;
    case "ONGOING":   return <Badge className="bg-yellow-500 text-white">Berlangsung</Badge>;
    case "ENDED":     return <Badge className="bg-green-500 text-white">Selesai</Badge>;
    case "CANCELLED": return <Badge variant="destructive">Dibatalkan</Badge>;
    default:          return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function GroupClassReportPage() {
  // Temp filter states
  const [tempStartDate, setTempStartDate] = useState<Date>(subDays(new Date(), 30));
  const [tempEndDate, setTempEndDate] = useState<Date>(endOfDay(new Date()));
  const [tempSelectedTrainer, setTempSelectedTrainer] = useState<string>("all");
  const [tempSelectedGroup, setTempSelectedGroup] = useState<string>("all");
  const [tempStatusFilter, setTempStatusFilter] = useState<string>("all");

  // Applied filter states
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(endOfDay(new Date()));
  const [selectedTrainer, setSelectedTrainer] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch report
  const { data: reportData, isLoading, refetch } = api.groupClass.getReport.useQuery({
    startDate,
    endDate,
    trainerId: selectedTrainer === "all" ? undefined : selectedTrainer,
    groupSubscriptionId: selectedGroup === "all" ? undefined : selectedGroup,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Fetch trainers for dropdown
  const { data: trainers } = api.personalTrainer.listAllActive.useQuery();

  // Fetch group subscriptions for dropdown
  const { data: groupSubs } = api.groupClass.listGroupSubscriptions.useQuery();

  const handleApplyFilters = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setSelectedTrainer(tempSelectedTrainer);
    setSelectedGroup(tempSelectedGroup);
    setStatusFilter(tempStatusFilter);
  };

  const handleResetFilters = () => {
    const defaultStart = subDays(new Date(), 30);
    const defaultEnd = new Date();
    setTempStartDate(defaultStart);
    setTempEndDate(endOfDay(defaultEnd));
    setTempSelectedTrainer("all");
    setTempSelectedGroup("all");
    setTempStatusFilter("all");
    setStartDate(defaultStart);
    setEndDate(endOfDay(defaultEnd));
    setSelectedTrainer("all");
    setSelectedGroup("all");
    setStatusFilter("all");
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!reportData) return;

    const workbook = XLSX.utils.book_new();

    // Sheet 1: Session Details
    const sessionData = reportData.sessions.map((s) => ({
      "Tanggal": format(new Date(s.schedule), "yyyy-MM-dd"),
      "Waktu": `${format(new Date(s.schedule), "HH:mm")} - ${format(new Date(s.endTime), "HH:mm")}`,
      "Durasi (menit)": s.duration,
      "Trainer": s.trainerName,
      "Group": s.groupName,
      "Lead Member": s.leadMemberName,
      "Jenis Kelas": s.classTypeName,
      "Status": s.status,
      "Hadir": s.attendanceCount,
      "Total Member": s.totalMembers,
      "Deskripsi": s.description || "",
      "Dibuat Oleh": s.creatorName,
    }));

    const sessionWs = XLSX.utils.json_to_sheet(sessionData);
    sessionWs["!cols"] = Object.keys(sessionData[0] || {}).map((k) => ({ wch: Math.max(k.length, 15) }));
    XLSX.utils.book_append_sheet(workbook, sessionWs, "Sessions");

    // Sheet 2: Trainer Summary
    const trainerData = reportData.trainerSummary.map((t) => ({
      "Trainer": t.name,
      "Total Conduct": t.sessions,
      "Total Jam": t.hours.toFixed(2),
      "Total Hadir": t.attendees,
    }));

    const trainerWs = XLSX.utils.json_to_sheet(trainerData);
    trainerWs["!cols"] = Object.keys(trainerData[0] || {}).map((k) => ({ wch: Math.max(k.length, 15) }));
    XLSX.utils.book_append_sheet(workbook, trainerWs, "Trainer Summary");

    // Sheet 3: Report Info
    const reportInfo = [
      { "Metric": "Report Period", "Value": `${format(startDate, "PPP")} - ${format(endDate, "PPP")}` },
      { "Metric": "Generated At", "Value": format(new Date(), "PPP p") },
      { "Metric": "Total Conduct", "Value": reportData.totalSessions.toString() },
      { "Metric": "Completed", "Value": reportData.completedSessions.toString() },
      { "Metric": "Cancelled", "Value": reportData.cancelledSessions.toString() },
      { "Metric": "Scheduled", "Value": reportData.scheduledSessions.toString() },
      { "Metric": "Total Hours", "Value": reportData.totalHours.toFixed(2) },
      { "Metric": "Total Attendees", "Value": reportData.totalAttendees.toString() },
    ];

    const infoWs = XLSX.utils.json_to_sheet(reportInfo);
    infoWs["!cols"] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, infoWs, "Report Info");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `group-class-report-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">Group Class Report</h1>
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
    <ProtectedRoute requiredPermissions={["create:session"]}>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Group Class Report</h1>
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={format(tempStartDate, "yyyy-MM-dd")}
                    onChange={(e) => setTempStartDate(new Date(e.target.value))}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={format(tempEndDate, "yyyy-MM-dd")}
                    onChange={(e) => setTempEndDate(endOfDay(new Date(e.target.value)))}
                  />
                </div>
                <div>
                  <Label>Trainer</Label>
                  <Select value={tempSelectedTrainer} onValueChange={setTempSelectedTrainer}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Trainers</SelectItem>
                      {trainers?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.user.name ?? "Unknown"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Group</Label>
                  <Select value={tempSelectedGroup} onValueChange={setTempSelectedGroup}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Groups</SelectItem>
                      {groupSubs?.map((gs) => (
                        <SelectItem key={gs.id} value={gs.id}>
                          {gs.groupName ?? `Group - ${gs.leadSubscription.member.user.name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={tempStatusFilter} onValueChange={setTempStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="SCHEDULED">Terjadwal</SelectItem>
                      <SelectItem value="ENDED">Selesai</SelectItem>
                      <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
                <Button onClick={handleApplyFilters} disabled={isLoading}>
                  <Filter className="mr-2 h-4 w-4" />
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conduct</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData?.totalSessions ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selesai</CardTitle>
              <Dumbbell className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{reportData?.completedSessions ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Terjadwal</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{reportData?.scheduledSessions ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dibatalkan</CardTitle>
              <Calendar className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{reportData?.cancelledSessions ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jam</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(reportData?.totalHours ?? 0).toFixed(1)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hadir</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData?.totalAttendees ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Trainer Summary */}
        {reportData?.trainerSummary && reportData.trainerSummary.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan per Trainer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Trainer</th>
                      <th className="text-right py-2">Conduct</th>
                      <th className="text-right py-2">Total Jam</th>
                      <th className="text-right py-2">Total Hadir</th>
                      <th className="text-right py-2">Avg Hadir/Sesi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.trainerSummary.map((t) => (
                      <tr key={t.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 font-medium">{t.name}</td>
                        <td className="py-2 text-right">{t.sessions}</td>
                        <td className="py-2 text-right">{t.hours.toFixed(1)}</td>
                        <td className="py-2 text-right">{t.attendees}</td>
                        <td className="py-2 text-right">
                          {t.sessions > 0 ? (t.attendees / t.sessions).toFixed(1) : "0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detail Sesi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Tanggal</th>
                    <th className="text-left py-2">Waktu</th>
                    <th className="text-left py-2">Trainer</th>
                    <th className="text-left py-2">Group</th>
                    <th className="text-left py-2">Kelas</th>
                    <th className="text-right py-2">Durasi</th>
                    <th className="text-center py-2">Kehadiran</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData?.sessions && reportData.sessions.length > 0 ? (
                    reportData.sessions.map((s) => (
                      <tr key={s.id} className="border-b hover:bg-muted/50">
                        <td className="py-2">
                          {format(new Date(s.schedule), "dd MMM yyyy", { locale: localeId })}
                        </td>
                        <td className="py-2">
                          {format(new Date(s.schedule), "HH:mm")} - {format(new Date(s.endTime), "HH:mm")}
                        </td>
                        <td className="py-2">
                          <div className="font-medium">{s.trainerName}</div>
                        </td>
                        <td className="py-2">
                          <div className="font-medium">{s.groupName}</div>
                          <div className="text-xs text-muted-foreground">Lead: {s.leadMemberName}</div>
                        </td>
                        <td className="py-2">{s.classTypeName}</td>
                        <td className="py-2 text-right">{s.duration} min</td>
                        <td className="py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${
                            s.attendanceCount === s.totalMembers
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                          }`}>
                            {s.attendanceCount}/{s.totalMembers}
                          </span>
                        </td>
                        <td className="py-2">{statusBadge(s.status)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        Tidak ada data untuk filter yang dipilih.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div className="flex gap-8">
                <div>
                  <span className="text-sm text-muted-foreground">Total Conduct: </span>
                  <span className="font-bold text-lg">{reportData?.totalSessions ?? 0}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Selesai: </span>
                  <span className="font-bold text-lg text-green-600">{reportData?.completedSessions ?? 0}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Total Jam: </span>
                  <span className="font-bold text-lg">{(reportData?.totalHours ?? 0).toFixed(1)}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Total Hadir: </span>
                  <span className="font-bold text-lg">{reportData?.totalAttendees ?? 0}</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Period: {format(startDate, "dd MMM yyyy", { locale: localeId })} - {format(endDate, "dd MMM yyyy", { locale: localeId })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
