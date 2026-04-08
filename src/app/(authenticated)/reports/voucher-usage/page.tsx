"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { format, subDays } from "date-fns";
import { Ticket, Users, Hash, FileSpreadsheet } from "lucide-react";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import * as XLSX from "xlsx-js-style";

const formatDiscount = (discountType: string, amount: number) =>
  discountType === "PERCENT" ? `${amount}%` : `Rp${amount.toLocaleString("id-ID")}`;

export default function VoucherUsageReportPage() {
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>("all");

  const { data: allVouchers = [] } = api.voucher.getAll.useQuery();

  const { data: report, isLoading } = api.voucher.getUsageReport.useQuery({
    startDate,
    endDate,
    voucherId: selectedVoucherId === "all" ? undefined : selectedVoucherId,
  });

  const exportToExcel = () => {
    if (!report) return;
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = report.summary.map((s) => ({
      "Nama Voucher": s.voucherName,
      "Tipe": s.type,
      "Tipe Diskon": s.discountType,
      "Nilai Diskon": formatDiscount(s.discountType, s.amount),
      "Kode Referral": s.referralCode ?? "-",
      "Jumlah Penggunaan": s.claimCount,
    }));
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet["!cols"] = Object.keys(summaryData[0] ?? {}).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan Voucher");

    // Detail sheet
    const detailData = report.claims.map((c) => ({
      "Nama Voucher": c.voucher.name,
      "Tipe": c.voucher.type,
      "Nilai Diskon": formatDiscount(c.voucher.discountType, c.voucher.amount),
      "Nama Member": c.member.name ?? "-",
      "Email Member": c.member.email ?? "-",
      "Tanggal Klaim": format(new Date(c.claimedAt), "dd/MM/yyyy HH:mm"),
    }));
    const detailSheet = XLSX.utils.json_to_sheet(detailData);
    detailSheet["!cols"] = Object.keys(detailData[0] ?? {}).map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Detail Penggunaan");

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `laporan-voucher-${format(startDate, "yyyy-MM-dd")}-sd-${format(endDate, "yyyy-MM-dd")}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ProtectedRoute requiredPermissions={["report:voucher"]}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Laporan Penggunaan Voucher</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Lihat voucher yang digunakan member pada periode tertentu
            </p>
          </div>
          <Button
            onClick={exportToExcel}
            disabled={!report || report.totalClaims === 0}
            variant="outline"
            className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={format(startDate, "yyyy-MM-dd")}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                />
              </div>
              <div>
                <Label>Tanggal Selesai</Label>
                <Input
                  type="date"
                  value={format(endDate, "yyyy-MM-dd")}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                />
              </div>
              <div>
                <Label>Voucher</Label>
                <Select value={selectedVoucherId} onValueChange={setSelectedVoucherId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Voucher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Voucher</SelectItem>
                    {allVouchers.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Penggunaan</CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{report?.totalClaims ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">kali voucher diklaim</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Voucher Berbeda</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{report?.uniqueVouchers ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">jenis voucher digunakan</p>
            </CardContent>
          </Card>
        </div>

        {/* Per-Voucher Summary */}
        {report && report.summary.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan per Voucher</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Voucher</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Nilai Diskon</TableHead>
                    <TableHead>Kode Referral</TableHead>
                    <TableHead className="text-right">Jumlah Klaim</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.summary.map((s) => (
                    <TableRow key={s.voucherId}>
                      <TableCell className="font-medium">{s.voucherName}</TableCell>
                      <TableCell>
                        <Badge variant={s.type === "REFERRAL" ? "default" : "secondary"}>
                          {s.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDiscount(s.discountType, s.amount)}</TableCell>
                      <TableCell>{s.referralCode ?? <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell className="text-right font-bold">{s.claimCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Detail Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Detail Penggunaan per Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-10 text-center text-muted-foreground">Memuat data...</div>
            ) : !report || report.claims.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                Tidak ada data penggunaan voucher pada periode ini.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Voucher</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Nilai Diskon</TableHead>
                    <TableHead>Nama Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tanggal Klaim</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.claims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-medium">{claim.voucher.name}</TableCell>
                      <TableCell>
                        <Badge variant={claim.voucher.type === "REFERRAL" ? "default" : "secondary"}>
                          {claim.voucher.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDiscount(claim.voucher.discountType, claim.voucher.amount)}</TableCell>
                      <TableCell>{claim.member.name ?? "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{claim.member.email ?? "-"}</TableCell>
                      <TableCell>{format(new Date(claim.claimedAt), "dd/MM/yyyy HH:mm")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
