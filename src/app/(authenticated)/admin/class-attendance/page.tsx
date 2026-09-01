"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import {
  UserCheck,
  UserX,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const typeLabel: Record<string, string> = {
  CLASS: "Class",
  CLASS_VISIT: "Class Visit",
  GROUP_CLASS: "Group Class",
};

const typeColor: Record<string, string> = {
  CLASS: "border-blue-400 text-blue-500",
  CLASS_VISIT: "border-indigo-400 text-indigo-500",
  GROUP_CLASS: "border-emerald-400 text-emerald-500",
};

const statusBadge: Record<string, { color: string; icon: React.ReactNode }> = {
  HADIR: { color: "bg-green-600 text-white", icon: <CheckCircle2 className="h-3 w-3" /> },
  "TIDAK HADIR": { color: "bg-red-600 text-white", icon: <XCircle className="h-3 w-3" /> },
  BELUM: { color: "bg-yellow-600 text-white", icon: <Clock className="h-3 w-3" /> },
  TERKONFIRMASI: { color: "bg-blue-600 text-white", icon: <Clock className="h-3 w-3" /> },
};

const ClassAttendancePage: React.FC = () => {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const toDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [startDate, setStartDate] = useState(toDateStr(firstOfMonth));
  const [endDate, setEndDate] = useState(toDateStr(today));
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [instructor, setInstructor] = useState("");
  const [appliedInstructor, setAppliedInstructor] = useState("");
  const [type, setType] = useState<"all" | "class" | "class_visit" | "group_class">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = api.class.attendanceSummary.useQuery(
    {
      startDate: new Date(startDate),
      endDate: new Date(endDate + "T23:59:59"),
      search: appliedSearch || undefined,
      instructorName: appliedInstructor || undefined,
      type,
      page,
      pageSize,
    },
    { keepPreviousData: true },
  );

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;
  const attendanceRate =
    data && data.total > 0 ? ((data.totalAttended / data.total) * 100).toFixed(1) : "0";

  const handleSearch = () => {
    setAppliedSearch(search);
    setAppliedInstructor(instructor);
    setPage(1);
  };

  return (
    <ProtectedRoute requiredPermissions={["menu:class-attendance"]}>
      <div className="flex flex-col gap-4 p-6">
        <div>
          <h1 className="text-2xl font-bold">Class Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Rekap kehadiran member di semua jenis kelas
          </p>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tipe Kelas</label>
              <select
                value={type}
                onChange={(e) => { setType(e.target.value as typeof type); setPage(1); }}
                className="flex h-9 w-44 rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm"
              >
                <option value="all">Semua</option>
                <option value="class">Class</option>
                <option value="class_visit">Class Visit</option>
                <option value="group_class">Group Class</option>
              </select>
            </div>
            <div className="min-w-[160px]">
              <label className="text-xs text-muted-foreground">Instruktur / Trainer</label>
              <Input
                placeholder="Nama instruktur/trainer..."
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground">Cari Member</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nama member..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button size="icon" variant="outline" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-blue-500/10 p-2">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Peserta</p>
              <p className="text-xl font-bold">{data?.total ?? 0}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-green-500/10 p-2">
              <UserCheck className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hadir</p>
              <p className="text-xl font-bold">{data?.totalAttended ?? 0}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-amber-500/10 p-2">
              <UserX className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tingkat Kehadiran</p>
              <p className="text-xl font-bold">{attendanceRate}%</p>
            </div>
          </Card>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Member</th>
                  <th className="px-4 py-3 text-left">Kelas</th>
                  <th className="px-4 py-3 text-left">Tipe</th>
                  <th className="px-4 py-3 text-left">Instruktur / Trainer</th>
                  <th className="px-4 py-3 text-left">Jadwal</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Memuat data...
                    </td>
                  </tr>
                ) : !data || data.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Tidak ada data kehadiran untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  data.items.map((row) => (
                    <tr key={row.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{row.memberName}</td>
                      <td className="px-4 py-3">
                        <div>{row.className}</div>
                        {row.classTypeName && (
                          <span className="text-xs text-muted-foreground">{row.classTypeName}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] ${typeColor[row.type] ?? ""}`}>
                          {typeLabel[row.type] ?? row.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.instructorName}</td>
                      <td className="px-4 py-3 text-xs">
                        {format(new Date(row.schedule), "EEE, d MMM yyyy HH:mm", { locale: localeId })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={`text-[10px] inline-flex items-center gap-1 ${statusBadge[row.status]?.color ?? "bg-gray-500 text-white"}`}>
                          {statusBadge[row.status]?.icon}
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.total > pageSize && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.total)} dari{" "}
                {data.total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs">
                  {page} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
};

export default ClassAttendancePage;
