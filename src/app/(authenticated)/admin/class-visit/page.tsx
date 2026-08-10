"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  DollarSign,
  ImageIcon,
  ExternalLink,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type RegistrationStatus = "PENDING_PAYMENT" | "CONFIRMED" | "ATTENDED" | "NO_SHOW" | "CANCELLED" | "all";

const statusBadge = (status: string) => {
  switch (status) {
    case "PENDING_PAYMENT": return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Menunggu Bayar</Badge>;
    case "CONFIRMED":       return <Badge variant="outline" className="border-blue-500 text-blue-600">Terkonfirmasi</Badge>;
    case "ATTENDED":        return <Badge className="bg-green-500 text-white">Hadir</Badge>;
    case "NO_SHOW":         return <Badge variant="destructive">Tidak Hadir</Badge>;
    case "CANCELLED":       return <Badge variant="secondary">Dibatalkan</Badge>;
    default:                return <Badge variant="secondary">{status}</Badge>;
  }
};

const paymentBadge = (status: string) => {
  switch (status) {
    case "FREE":     return <Badge className="bg-purple-500 text-white">Gratis</Badge>;
    case "PENDING":  return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Belum Bayar</Badge>;
    case "PAID":     return <Badge className="bg-green-500 text-white">Lunas</Badge>;
    case "REFUNDED": return <Badge variant="secondary">Refunded</Badge>;
    default:         return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function ClassVisitPage() {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus>("all");
  const [classFilter, setClassFilter] = useState<"all" | "past" | "upcoming">("upcoming");

  // Register dialog
  const [registerOpen, setRegisterOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [memberSearch, setMemberSearch] = useState<string>("");

  // Confirm payment dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmReg, setConfirmReg] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [confirmBalanceAccountId, setConfirmBalanceAccountId] = useState<string>("");

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReg, setCancelReg] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState<string>("");

  // Payment proof upload
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setProofPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null);
    }
  };

  const clearProofFile = () => {
    setProofFile(null);
    setProofPreview(null);
  };

  // ─── Queries ─────────────────────────────────────────────────────────
  const { data: classesData, isLoading: loadingClasses, refetch: refetchClasses } =
    api.classVisit.listClasses.useQuery({ filter: classFilter, pageSize: 50 });

  const { data: registrations, isLoading: loadingRegs, refetch: refetchRegs } =
    api.classVisit.listByClass.useQuery(
      { classId: selectedClassId!, status: statusFilter },
      { enabled: !!selectedClassId },
    );

  const { data: members, isLoading: loadingMembers } = api.member.getAll.useQuery(undefined, {
    enabled: registerOpen,
  });

  const { data: balanceAccounts } = api.balanceAccount.getAll.useQuery(
    { page: 1, limit: 100 },
    { enabled: confirmOpen },
  );

  // ─── Mutations ───────────────────────────────────────────────────────
  const registerMut = api.classVisit.register.useMutation({
    onSuccess: (data: any) => {
      const msg =
        data.coverage === "MEMBERSHIP"
          ? "Member berhasil didaftarkan (Gratis – punya GYM_MEMBERSHIP aktif)"
          : data.coverage === "CLASS_SESSION"
            ? "Member berhasil didaftarkan (1 sesi kelas dipotong)"
            : "Request pendaftaran berhasil. Menunggu konfirmasi pembayaran.";
      toast.success(msg);
      setRegisterOpen(false);
      setSelectedMemberId("");
      setMemberSearch("");
      void refetchRegs();
      void refetchClasses();
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadProofMut = api.classVisit.uploadPaymentProof.useMutation();

  const confirmMut = api.classVisit.confirmPayment.useMutation({
    onSuccess: () => {
      toast.success("Pembayaran dikonfirmasi. Member resmi terdaftar.");
      setConfirmOpen(false);
      setConfirmReg(null);
      setConfirmBalanceAccountId("");
      clearProofFile();
      void refetchRegs();
      void refetchClasses();
    },
    onError: (e) => toast.error(e.message),
  });

  const attendMut = api.classVisit.markAttendance.useMutation({
    onSuccess: (data) => {
      toast.success(data.status === "ATTENDED" ? "Member ditandai hadir." : "Member ditandai tidak hadir.");
      void refetchRegs();
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMut = api.classVisit.cancel.useMutation({
    onSuccess: () => {
      toast.success("Registrasi dibatalkan.");
      setCancelOpen(false);
      setCancelReg(null);
      void refetchRegs();
      void refetchClasses();
    },
    onError: (e) => toast.error(e.message),
  });

  // ─── Filtered members for search ─────────────────────────────────────
  const filteredMembers = members?.filter((m: any) =>
    !memberSearch || m.user?.name?.toLowerCase().includes(memberSearch.toLowerCase()),
  ) ?? [];

  const selectedClass = classesData?.items.find((c) => c.id === selectedClassId);

  return (
    <ProtectedRoute requiredPermissions={["manage:class-visit"]}>
      <div className="container mx-auto py-6 space-y-6">

        {/* ─── Header ─── */}
        <div className="flex items-center gap-4">
          {selectedClassId && (
            <Button variant="ghost" size="sm" onClick={() => { setSelectedClassId(null); setStatusFilter("all"); }}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {selectedClassId ? `Detail Kelas: ${selectedClass?.name ?? ""}` : "Class Visit"}
            </h1>
            <p className="text-muted-foreground">
              {selectedClassId
                ? "Kelola pendaftaran kunjungan kelas"
                : "Pilih kelas untuk mengelola pendaftaran kunjungan"}
            </p>
          </div>
        </div>

        {/* ══════════════ LIST VIEW ══════════════ */}
        {!selectedClassId && (
          <div className="space-y-4">
            <ToggleGroup
              type="single"
              value={classFilter}
              onValueChange={(v) => { if (v) setClassFilter(v as "all" | "past" | "upcoming"); }}
              className="justify-start"
            >
              <ToggleGroupItem value="upcoming" className="text-sm">Coming Soon</ToggleGroupItem>
              <ToggleGroupItem value="past" className="text-sm">Past</ToggleGroupItem>
              <ToggleGroupItem value="all" className="text-sm">All</ToggleGroupItem>
            </ToggleGroup>

          <div className="grid gap-4">
            {loadingClasses ? (
              <p className="text-muted-foreground text-sm">Memuat data kelas...</p>
            ) : classesData?.items.length === 0 ? (
              <p className="text-muted-foreground text-sm">Tidak ada kelas tersedia.</p>
            ) : (
              classesData?.items.map((cls) => (
                <Card
                  key={cls.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedClassId(cls.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-base">{cls.name}</span>
                          {cls.classType && (
                            <Badge variant="secondary" className="text-xs">{cls.classType.name}</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          <p>📅 {format(new Date(cls.schedule), "EEEE, dd MMM yyyy • HH:mm", { locale: localeId })} ({cls.duration} mnt)</p>
                          <p>👤 {cls.instructorName} &nbsp;|&nbsp; 💰 Rp {cls.price.toLocaleString("id-ID")}/kunjungan</p>
                          {cls.limit && <p>🪑 Kapasitas: {cls.limit}</p>}
                        </div>
                      </div>
                      <div className="flex gap-3 text-sm shrink-0">
                        <div className="text-center">
                          <div className="font-bold text-yellow-600">{cls.visitStats.pending}</div>
                          <div className="text-muted-foreground text-xs">Pending</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-blue-600">{cls.visitStats.confirmed}</div>
                          <div className="text-muted-foreground text-xs">Confirmed</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-green-600">{cls.visitStats.attended}</div>
                          <div className="text-muted-foreground text-xs">Hadir</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          </div>
        )}

        {/* ══════════════ DETAIL VIEW ══════════════ */}
        {selectedClassId && selectedClass && (
          <div className="space-y-4">
            {/* Info card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-6 text-sm">
                  <div><span className="text-muted-foreground">Jadwal:</span> <span className="font-medium">{format(new Date(selectedClass.schedule), "EEEE, dd MMM yyyy • HH:mm", { locale: localeId })}</span></div>
                  <div><span className="text-muted-foreground">Instruktur:</span> <span className="font-medium">{selectedClass.instructorName}</span></div>
                  <div><span className="text-muted-foreground">Durasi:</span> <span className="font-medium">{selectedClass.duration} menit</span></div>
                  <div><span className="text-muted-foreground">Harga Visit:</span> <span className="font-medium">Rp {selectedClass.price.toLocaleString("id-ID")}</span></div>
                  {selectedClass.limit && <div><span className="text-muted-foreground">Kapasitas:</span> <span className="font-medium">{selectedClass.limit}</span></div>}
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  <div className="flex items-center gap-1 text-sm"><Clock className="w-4 h-4 text-yellow-500" /> <span className="font-semibold text-yellow-600">{selectedClass.visitStats.pending}</span> <span className="text-muted-foreground">Pending</span></div>
                  <div className="flex items-center gap-1 text-sm"><Users className="w-4 h-4 text-blue-500" /> <span className="font-semibold text-blue-600">{selectedClass.visitStats.confirmed}</span> <span className="text-muted-foreground">Terkonfirmasi</span></div>
                  <div className="flex items-center gap-1 text-sm"><CheckCircle className="w-4 h-4 text-green-500" /> <span className="font-semibold text-green-600">{selectedClass.visitStats.attended}</span> <span className="text-muted-foreground">Hadir</span></div>
                  <div className="flex items-center gap-1 text-sm"><DollarSign className="w-4 h-4 text-purple-500" /> <span className="font-semibold text-purple-600">{selectedClass.visitStats.free}</span> <span className="text-muted-foreground">Gratis (member)</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button onClick={() => setRegisterOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" /> Daftarkan Member
              </Button>
            </div>

            {/* Tabs */}
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as RegistrationStatus)}>
              <TabsList>
                <TabsTrigger value="all">Semua</TabsTrigger>
                <TabsTrigger value="PENDING_PAYMENT">
                  Pending {selectedClass.visitStats.pending > 0 && <span className="ml-1 text-yellow-600 font-bold">({selectedClass.visitStats.pending})</span>}
                </TabsTrigger>
                <TabsTrigger value="CONFIRMED">Terkonfirmasi</TabsTrigger>
                <TabsTrigger value="ATTENDED">Hadir</TabsTrigger>
                <TabsTrigger value="CANCELLED">Dibatalkan</TabsTrigger>
              </TabsList>

              <TabsContent value={statusFilter} className="mt-4">
                {loadingRegs ? (
                  <p className="text-muted-foreground text-sm py-4">Memuat...</p>
                ) : !registrations || registrations.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4">Tidak ada data.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Pembayaran</TableHead>
                          <TableHead>Metode</TableHead>
                          <TableHead>Terdaftar</TableHead>
                          <TableHead>Catatan</TableHead>
                          <TableHead className="text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {registrations.map((reg: any) => (
                          <TableRow key={reg.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="font-medium">{reg.member?.user?.name ?? "-"}</div>
                                {reg.requestedByMember && (
                                  <Badge variant="outline" className="border-blue-400 text-blue-600 text-xs px-1 py-0">Self-Request</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{reg.member?.user?.phone ?? reg.member?.user?.email ?? ""}</div>
                            </TableCell>
                            <TableCell>{statusBadge(reg.status)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {paymentBadge(reg.paymentStatus)}
                                {reg.paymentProof && (
                                  <a
                                    href={reg.paymentProof}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-500 flex items-center gap-0.5 hover:underline"
                                  >
                                    <ExternalLink className="w-3 h-3" /> Lihat Bukti
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{reg.paymentMethod ?? "-"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(reg.createdAt), "dd MMM yyyy HH:mm")}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                              {reg.notes ?? reg.cancelReason ?? "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-center flex-wrap">
                                {reg.status === "PENDING_PAYMENT" && (
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                    onClick={() => { setConfirmReg(reg); setPaymentMethod("CASH"); setPaymentNotes(""); setConfirmBalanceAccountId(""); clearProofFile(); setConfirmOpen(true); }}>
                                    Konfirmasi Bayar
                                  </Button>
                                )}
                                {reg.status === "CONFIRMED" && (
                                  <>
                                    <Button size="sm" variant="outline" className="text-green-600 border-green-500 text-xs"
                                      onClick={() => attendMut.mutate({ registrationId: reg.id, attended: true })}>
                                      <CheckCircle className="w-3 h-3 mr-1" /> Hadir
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-orange-600 border-orange-500 text-xs"
                                      onClick={() => attendMut.mutate({ registrationId: reg.id, attended: false })}>
                                      <XCircle className="w-3 h-3 mr-1" /> Absen
                                    </Button>
                                  </>
                                )}
                                {(reg.status === "PENDING_PAYMENT" || reg.status === "CONFIRMED") && (
                                  <Button size="sm" variant="ghost" className="text-red-500 text-xs"
                                    onClick={() => { setCancelReg(reg); setCancelReason(""); setCancelOpen(true); }}>
                                    Batal
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* ══════════════ DIALOG: Register Member ══════════════ */}
        <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Daftarkan Member ke Kelas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Sistem otomatis menentukan biaya:<br />
                1. Punya <strong>GYM_MEMBERSHIP aktif</strong> → gratis.<br />
                2. Punya <strong>sesi CLASS_SESSION</strong> → potong 1 sesi.<br />
                3. Tidak keduanya → <strong>Menunggu Pembayaran</strong> (drop-in).
              </p>
              <div>
                <Label>Cari Member</Label>
                <Input
                  placeholder="Ketik nama member..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="mb-2"
                />
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId} disabled={loadingMembers}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingMembers ? "Memuat..." : "Pilih member"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredMembers.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.user?.name ?? m.user?.email ?? m.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRegisterOpen(false)}>Batal</Button>
              <Button
                disabled={!selectedMemberId || registerMut.isPending}
                onClick={() => registerMut.mutate({ classId: selectedClassId!, memberId: selectedMemberId })}
              >
                {registerMut.isPending ? "Mendaftarkan..." : "Daftarkan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════ DIALOG: Confirm Payment ══════════════ */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Member:</span> <strong>{confirmReg?.member?.user?.name}</strong></p>
                <p><span className="text-muted-foreground">Kelas:</span> <strong>{selectedClass?.name}</strong></p>
                <p><span className="text-muted-foreground">Nominal:</span> <strong>Rp {confirmReg?.paidAmount?.toLocaleString("id-ID")}</strong></p>
              </div>
              <div>
                <Label>Metode Pembayaran</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash / Tunai</SelectItem>
                    <SelectItem value="TRANSFER">Transfer Bank</SelectItem>
                    <SelectItem value="QRIS">QRIS</SelectItem>
                    <SelectItem value="OTHER">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(confirmReg?.paidAmount ?? 0) > 0 && (
                <div>
                  <Label>Payment Account (Bank) <span className="text-red-500">*</span></Label>
                  <Select value={confirmBalanceAccountId} onValueChange={setConfirmBalanceAccountId}>
                    <SelectTrigger><SelectValue placeholder="Pilih akun bank..." /></SelectTrigger>
                    <SelectContent>
                      {(balanceAccounts as any)?.items?.map((acc: any) => (
                        <SelectItem key={acc.id} value={String(acc.id)}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Akan dicatat di laporan cash bank.</p>
                </div>
              )}
              <div>
                <Label>Bukti Pembayaran (opsional)</Label>
                <div className="mt-1 space-y-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    onChange={handleProofFileChange}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                  />
                  {proofPreview && (
                    <div className="relative">
                      <img src={proofPreview} alt="Preview" className="rounded border max-h-40 object-contain w-full" />
                      <button onClick={clearProofFile} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">&times;</button>
                    </div>
                  )}
                  {proofFile && !proofPreview && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> {proofFile.name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Maks 5MB • JPG, PNG, PDF</p>
                </div>
              </div>
              <div>
                <Label>Catatan (opsional)</Label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Catatan tambahan..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Batal</Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={
                  confirmMut.isPending ||
                  uploadingProof ||
                  ((confirmReg?.paidAmount ?? 0) > 0 && !confirmBalanceAccountId)
                }
                onClick={async () => {
                  // Upload proof first if a file is selected
                  let uploadedProofPath: string | undefined;
                  if (proofFile && confirmReg) {
                    try {
                      setUploadingProof(true);
                      const reader = new FileReader();
                      const base64 = await new Promise<string>((resolve, reject) => {
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(proofFile);
                      });
                      const res = await uploadProofMut.mutateAsync({
                        registrationId: confirmReg.id,
                        fileData: base64,
                        fileName: proofFile.name,
                        fileType: proofFile.type,
                      });
                      uploadedProofPath = res.filePath;
                    } catch {
                      toast.error("Gagal upload bukti pembayaran.");
                      setUploadingProof(false);
                      return;
                    } finally {
                      setUploadingProof(false);
                    }
                  }
                  confirmMut.mutate({
                    registrationId: confirmReg.id,
                    paymentMethod,
                    paymentProof: uploadedProofPath,
                    notes: paymentNotes || undefined,
                    balanceAccountId: confirmBalanceAccountId ? parseInt(confirmBalanceAccountId) : undefined,
                  });
                }}
              >
                {uploadingProof ? "Mengupload bukti..." : confirmMut.isPending ? "Mengkonfirmasi..." : "Konfirmasi Pembayaran"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════ DIALOG: Cancel ══════════════ */}
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Batalkan Registrasi</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Batalkan pendaftaran <strong>{cancelReg?.member?.user?.name}</strong>?
              </p>
              <div>
                <Label>Alasan (opsional)</Label>
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Alasan pembatalan..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelOpen(false)}>Tutup</Button>
              <Button
                variant="destructive"
                disabled={cancelMut.isPending}
                onClick={() => cancelMut.mutate({ registrationId: cancelReg.id, cancelReason: cancelReason || undefined })}
              >
                {cancelMut.isPending ? "Membatalkan..." : "Ya, Batalkan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </ProtectedRoute>
  );
}
