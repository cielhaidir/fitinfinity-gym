"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/app/_components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/app/_components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Loader2, Search, X, Coins, TrendingUp, TrendingDown, ArrowLeft, Pencil } from "lucide-react";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

const TYPE_OPTIONS = [
  { value: "ALL", label: "Semua Tipe" },
  { value: "EARN", label: "Dapat" },
  { value: "SPEND", label: "Tukar" },
  { value: "DEDUCT", label: "Dikurangi" },
  { value: "TRANSFER_IN", label: "Transfer Masuk" },
  { value: "TRANSFER_OUT", label: "Transfer Keluar" },
  { value: "ADJUSTMENT", label: "Penyesuaian" },
];

const SOURCE_OPTIONS = [
  { value: "ALL", label: "Semua Sumber" },
  { value: "CHECKIN", label: "Check-in" },
  { value: "GROUP_CLASS", label: "Group Class" },
  { value: "PAYMENT", label: "Pembayaran" },
  { value: "PACKAGE_PURCHASE", label: "Beli Paket" },
  { value: "SUBSCRIPTION", label: "Subscription" },
  { value: "REWARD_CLAIM", label: "Tukar Reward" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "ADMIN_ADJUST", label: "Admin" },
  { value: "CANCEL_SUBSCRIPTION", label: "Batal Subscription" },
];

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

export default function AdminPointHistoryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const utils = api.useUtils();
  const userIdParam = searchParams.get("userId") ?? "";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [type, setType] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const limit = 20;

  // If userId is provided, use listByUser; otherwise listAll
  const allQuery = api.pointHistory.listAll.useQuery(
    {
      page,
      limit,
      search: search || undefined,
      type: type !== "ALL" ? type : undefined,
      source: source !== "ALL" ? source : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
    { enabled: !userIdParam },
  );

  const userQuery = api.pointHistory.listByUser.useQuery(
    {
      userId: userIdParam,
      page,
      limit,
      type: type !== "ALL" ? type : undefined,
      source: source !== "ALL" ? source : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
    { enabled: !!userIdParam },
  );

  const data = userIdParam ? userQuery.data : allQuery.data;
  const isLoading = userIdParam ? userQuery.isLoading : allQuery.isLoading;

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // For member-specific view
  const memberName = (data as any)?.userName ?? "";
  const memberEmail = (data as any)?.userEmail ?? "";
  const currentBalance = (data as any)?.currentBalance ?? 0;

  // Get memberId from userId for the adjustment mutation
  const { data: memberData } = api.member.list.useQuery(
    { page: 1, limit: 1, search: memberEmail || "", searchColumn: "user.email" },
    { enabled: !!userIdParam && !!memberEmail },
  );
  const memberId = memberData?.items?.[0]?.id;

  const updatePointsMutation = api.profile.updatePoints.useMutation({
    onSuccess: async () => {
      toast.success("Poin berhasil disesuaikan");
      setAdjustOpen(false);
      setAdjustPoints("");
      setAdjustReason("");
      if (userIdParam) {
        await utils.pointHistory.listByUser.invalidate();
      } else {
        await utils.pointHistory.listAll.invalidate();
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menyesuaikan poin");
    },
  });

  const handleAdjust = () => {
    if (!memberId) { toast.error("Member tidak ditemukan"); return; }
    const pts = parseInt(adjustPoints);
    if (isNaN(pts) || pts < 0) { toast.error("Masukkan jumlah poin yang valid (>= 0)"); return; }
    updatePointsMutation.mutate({ memberId, points: pts });
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setType("ALL");
    setSource("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // Summary for member-specific view
  const totalEarned = items.filter((i) => i.amount > 0).reduce((s, i) => s + i.amount, 0);
  const totalSpent = items.filter((i) => i.amount < 0).reduce((s, i) => s + Math.abs(i.amount), 0);

  return (
    <ProtectedRoute requiredPermissions={["list:point-history"]}>
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {userIdParam && (
              <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {userIdParam ? `Kartu Poin — ${memberName}` : "Riwayat Poin Member"}
              </h1>
              <p className="text-muted-foreground">
                {userIdParam
                  ? `${memberEmail}`
                  : "Lihat seluruh riwayat transaksi poin semua member."}
              </p>
            </div>
          </div>
          {userIdParam && memberId && (
            <Button onClick={() => { setAdjustPoints(String(currentBalance)); setAdjustOpen(true); }}>
              <Pencil className="h-4 w-4 mr-2" /> Sesuaikan Poin
            </Button>
          )}
        </div>

        {/* Summary cards for specific member */}
        {userIdParam && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-yellow-500/20 p-2">
                  <Coins className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo Poin Saat Ini</p>
                  <p className="text-2xl font-bold">{currentBalance.toLocaleString("id-ID")}</p>
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
                  <p className="text-xl font-bold text-green-600">+{totalEarned.toLocaleString("id-ID")}</p>
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
                  <p className="text-xl font-bold text-red-600">-{totalSpent.toLocaleString("id-ID")}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {!userIdParam && (
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Cari member</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nama atau email..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button size="icon" variant="outline" onClick={handleSearch}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Tipe</Label>
                <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sumber</Label>
                <Select value={source} onValueChange={(v) => { setSource(v); setPage(1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" /> Reset
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-3">
              <div className="space-y-1">
                <Label className="text-xs">Dari Tanggal</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sampai Tanggal</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Memuat...</span>
              </div>
            ) : items.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Tidak ada data ditemukan.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Sumber</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead className="text-right">Saldo Saat Ini</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(item.createdAt), "dd MMM yyyy HH:mm", { locale: localeId })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium text-sm">{(item as any).user?.name ?? "-"}</span>
                            <br />
                            <span className="text-xs text-muted-foreground">{(item as any).user?.email ?? ""}</span>
                          </div>
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
                        <TableCell className="text-right text-sm font-medium">
                          {((item as any).user?.point ?? 0).toLocaleString("id-ID")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Total: {total} transaksi
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

      {/* Point Adjustment Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Sesuaikan Poin</DialogTitle>
            <DialogDescription>
              Ubah saldo poin untuk <strong>{memberName}</strong>. Saldo saat ini: <strong>{currentBalance}</strong> poin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label>Saldo Poin Baru</Label>
              <Input
                type="number"
                min="0"
                value={adjustPoints}
                onChange={(e) => setAdjustPoints(e.target.value)}
                placeholder="Masukkan jumlah poin baru"
              />
              {adjustPoints && !isNaN(parseInt(adjustPoints)) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Perubahan: <span className={parseInt(adjustPoints) - currentBalance >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                    {parseInt(adjustPoints) - currentBalance >= 0 ? "+" : ""}{parseInt(adjustPoints) - currentBalance} poin
                  </span>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)} disabled={updatePointsMutation.isPending}>
              Batal
            </Button>
            <Button onClick={handleAdjust} disabled={updatePointsMutation.isPending}>
              {updatePointsMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
