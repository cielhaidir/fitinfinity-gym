"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { FileSpreadsheet, Search, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from "xlsx-js-style";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function ChurnedMembersReportPage() {
  const [search, setSearch] = useState("");
  const [daysFilter, setDaysFilter] = useState<"all" | "lt30" | "gt30">("all");

  const { data, isLoading } = api.subs.getChurnedMembersAll.useQuery();

  const filtered = useMemo(() => {
    if (!data) return [];
    let result = data;

    // Days filter
    if (daysFilter === "lt30") {
      result = result.filter((m) => m.daysExpired !== null && m.daysExpired <= 30);
    } else if (daysFilter === "gt30") {
      result = result.filter((m) => m.daysExpired !== null && m.daysExpired > 30);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.phone.toLowerCase().includes(q) ||
          m.packageName.toLowerCase().includes(q),
      );
    }

    return result;
  }, [data, search, daysFilter]);

  const handleExport = () => {
    if (!filtered.length) return;
    const wsData = filtered.map((m, i) => ({
      No: i + 1,
      Nama: m.name,
      Email: m.email,
      Phone: m.phone,
      Sales: m.salesName ?? "-",
      "Paket Terakhir": m.packageName,
      "Mulai": m.startDate ? format(new Date(m.startDate), "dd/MM/yyyy") : "-",
      "Berakhir": m.endDate ? format(new Date(m.endDate), "dd/MM/yyyy") : "-",
      "Hari Sejak Expire": m.daysExpired ?? "-",
      "Pembayaran Terakhir": `Rp ${Number(m.lastPayment).toLocaleString("id-ID")}`,
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Member Berhenti");
    XLSX.writeFile(wb, `member-berhenti-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const getDaysLabel = (days: number | null) => {
    if (days === null) return "-";
    if (days <= 30) return { text: `${days} hari`, variant: "default" as const };
    if (days <= 90) return { text: `${days} hari`, variant: "secondary" as const };
    return { text: `${days} hari`, variant: "destructive" as const };
  };

  return (
    <ProtectedRoute requiredPermissions={["list:subscription"]}>
      <div className="flex flex-col gap-6 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserX className="h-6 w-6 text-red-500" />
              Report Member Berhenti
            </h1>
            <p className="text-muted-foreground text-sm">
              Member yang pernah memiliki membership GYM dan sudah tidak pernah perpanjang lagi.
            </p>
          </div>
          <Button onClick={handleExport} disabled={!filtered.length} variant="outline" size="sm">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Member Berhenti</div>
            <div className="text-2xl font-bold text-red-500">
              {isLoading ? "..." : data?.length ?? 0}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Berhenti &lt; 30 hari</div>
            <div className="text-2xl font-bold text-amber-500">
              {isLoading ? "..." : data?.filter((m) => m.daysExpired !== null && m.daysExpired <= 30).length ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">Masih bisa di-follow up</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Berhenti &gt; 30 hari</div>
            <div className="text-2xl font-bold text-gray-500">
              {isLoading ? "..." : data?.filter((m) => m.daysExpired !== null && m.daysExpired > 30).length ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">Kemungkinan lost</div>
          </Card>
        </div>

        {/* Search & Filter */}
        <Card className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama, email, phone, atau paket..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={daysFilter === "all" ? "default" : "outline"}
                onClick={() => setDaysFilter("all")}
              >
                Semua
              </Button>
              <Button
                size="sm"
                variant={daysFilter === "lt30" ? "default" : "outline"}
                onClick={() => setDaysFilter("lt30")}
              >
                &lt; 30 hari
              </Button>
              <Button
                size="sm"
                variant={daysFilter === "gt30" ? "default" : "outline"}
                onClick={() => setDaysFilter("gt30")}
              >
                &gt; 30 hari
              </Button>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {search ? "Tidak ada data yang cocok dengan pencarian." : "Tidak ada member yang berhenti."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Paket Terakhir</TableHead>
                      <TableHead>Mulai</TableHead>
                      <TableHead>Berakhir</TableHead>
                      <TableHead className="text-center">Lama Berhenti</TableHead>
                      <TableHead className="text-right">Bayar Terakhir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((m, i) => {
                      const daysInfo = getDaysLabel(m.daysExpired);
                      return (
                        <TableRow key={m.memberId}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium">{m.name}</div>
                            <div className="text-xs text-muted-foreground">{m.email}</div>
                          </TableCell>
                          <TableCell className="text-sm">{m.phone}</TableCell>
                          <TableCell className="text-sm">{m.salesName ?? "-"}</TableCell>
                          <TableCell className="text-sm">{m.packageName}</TableCell>
                          <TableCell className="text-sm">
                            {m.startDate ? format(new Date(m.startDate), "dd MMM yy", { locale: localeId }) : "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {m.endDate ? format(new Date(m.endDate), "dd MMM yy", { locale: localeId }) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {typeof daysInfo === "string" ? (
                              daysInfo
                            ) : (
                              <Badge variant={daysInfo.variant}>{daysInfo.text}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            Rp {Number(m.lastPayment).toLocaleString("id-ID")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {!isLoading && filtered.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Menampilkan {filtered.length} dari {data?.length ?? 0} member berhenti
          </p>
        )}
      </div>
    </ProtectedRoute>
  );
}
