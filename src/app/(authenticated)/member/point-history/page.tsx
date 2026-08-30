"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Coins, TrendingUp, TrendingDown, ArrowLeftRight, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

const typeBadge = (type: string) => {
  switch (type) {
    case "EARN": return <Badge className="bg-green-600 text-white text-xs">Dapat</Badge>;
    case "SPEND": return <Badge variant="destructive" className="text-xs">Tukar</Badge>;
    case "DEDUCT": return <Badge variant="destructive" className="text-xs">Dikurangi</Badge>;
    case "TRANSFER_IN": return <Badge className="bg-blue-600 text-white text-xs">Transfer Masuk</Badge>;
    case "TRANSFER_OUT": return <Badge className="bg-orange-500 text-white text-xs">Transfer Keluar</Badge>;
    case "ADJUSTMENT": return <Badge variant="outline" className="text-xs">Penyesuaian</Badge>;
    default: return <Badge variant="secondary" className="text-xs">{type}</Badge>;
  }
};

const sourceLabel = (source: string) => {
  switch (source) {
    case "CHECKIN": return "Check-in";
    case "GROUP_CLASS": return "Group Class";
    case "PAYMENT": return "Pembayaran";
    case "PACKAGE_PURCHASE": return "Beli Paket";
    case "SUBSCRIPTION": return "Subscription";
    case "REWARD_CLAIM": return "Tukar Reward";
    case "TRANSFER": return "Transfer";
    case "ADMIN_ADJUST": return "Admin";
    case "CANCEL_SUBSCRIPTION": return "Batal Subscription";
    default: return source;
  }
};

export default function MemberPointHistoryPage() {
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, isLoading } = api.pointHistory.myHistory.useQuery({ page, limit });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const balance = data?.currentBalance ?? 0;

  // Summary counts from loaded data
  const earned = items.filter((i) => i.amount > 0).reduce((s, i) => s + i.amount, 0);
  const spent = items.filter((i) => i.amount < 0).reduce((s, i) => s + Math.abs(i.amount), 0);

  return (
    <ProtectedRoute requiredPermissions={["show:profile"]}>
      <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Riwayat Poin</h1>
          <p className="text-muted-foreground">Lihat riwayat perolehan dan penggunaan poin kamu.</p>
        </div>

        {/* Balance Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-500/20 p-2">
                <Coins className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Poin</p>
                <p className="text-2xl font-bold">{balance.toLocaleString("id-ID")}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-500/20 p-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Didapat (halaman ini)</p>
                <p className="text-xl font-bold text-green-600">+{earned.toLocaleString("id-ID")}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-500/20 p-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Digunakan (halaman ini)</p>
                <p className="text-xl font-bold text-red-600">-{spent.toLocaleString("id-ID")}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Riwayat Transaksi Poin</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Memuat...</span>
              </div>
            ) : items.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Belum ada riwayat poin.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Sumber</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(item.createdAt), "dd MMM yyyy HH:mm", { locale: localeId })}
                        </TableCell>
                        <TableCell>{typeBadge(item.type)}</TableCell>
                        <TableCell className="text-sm">{sourceLabel(item.source)}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{item.description}</TableCell>
                        <TableCell className="text-right font-semibold">
                          <span className={item.amount >= 0 ? "text-green-600" : "text-red-600"}>
                            {item.amount >= 0 ? `+${item.amount}` : item.amount}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {item.balance.toLocaleString("id-ID")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    {total} transaksi
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      {page} / {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
