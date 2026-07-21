"use client";

import { useState, useRef } from "react";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Clock,
  Users,
  DollarSign,
  Upload,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  ExternalLink,
} from "lucide-react";

const statusBadge = (status: string, isFree: boolean) => {
  if (isFree && status === "CONFIRMED") return <Badge className="bg-purple-500 text-white">Gratis</Badge>;
  switch (status) {
    case "PENDING_PAYMENT": return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Menunggu Konfirmasi</Badge>;
    case "CONFIRMED":       return <Badge variant="outline" className="border-blue-500 text-blue-600">Terkonfirmasi</Badge>;
    case "ATTENDED":        return <Badge className="bg-green-500 text-white">Hadir</Badge>;
    case "NO_SHOW":         return <Badge variant="destructive">Tidak Hadir</Badge>;
    case "CANCELLED":       return <Badge variant="secondary">Dibatalkan</Badge>;
    default:                return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function MemberClassVisitPage() {
  const [browsePage, setBrowsePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const pageSize = 8;

  // Request dialog
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);

  // Upload proof dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadReg, setUploadReg] = useState<any>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const {
    data: browseData,
    isLoading: loadingBrowse,
    refetch: refetchBrowse,
  } = api.classVisit.listAvailableClasses.useQuery({ page: browsePage, pageSize });

  const {
    data: historyData,
    isLoading: loadingHistory,
    refetch: refetchHistory,
  } = api.classVisit.myRequests.useQuery({ page: historyPage, pageSize });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const requestMut = api.classVisit.requestByMember.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setRequestOpen(false);
      setSelectedClass(null);
      void refetchBrowse();
      void refetchHistory();
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMut = api.classVisit.cancelByMember.useMutation({
    onSuccess: () => {
      toast.success("Request berhasil dibatalkan.");
      void refetchHistory();
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadProofMut = api.classVisit.uploadProofByMember.useMutation();

  // ── File handler ─────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleUploadProof = async () => {
    if (!proofFile || !uploadReg) return;
    try {
      setUploading(true);
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(proofFile);
      });
      await uploadProofMut.mutateAsync({
        registrationId: uploadReg.id,
        fileData: base64,
        fileName: proofFile.name,
        fileType: proofFile.type,
      });
      toast.success("Bukti pembayaran berhasil diupload. Tunggu konfirmasi admin.");
      setUploadOpen(false);
      setProofFile(null);
      setProofPreview(null);
      void refetchHistory();
    } catch {
      toast.error("Gagal upload bukti pembayaran.");
    } finally {
      setUploading(false);
    }
  };

  const totalBrowsePages = Math.ceil((browseData?.total ?? 0) / pageSize);
  const totalHistoryPages = Math.ceil((historyData?.total ?? 0) / pageSize);

  return (
    <ProtectedRoute requiredPermissions={["request:class-visit"]}>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Class Visit</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Daftar ke kelas favorit kamu — gratis jika kamu punya membership aktif, atau bayar per kelas.
          </p>
        </div>

        {browseData && !browseData.isMember && (
          <Card className="border-yellow-400 bg-yellow-50">
            <CardContent className="pt-4 pb-3 text-yellow-800 text-sm">
              ⚠️ Akun kamu belum terdaftar sebagai member gym. Hubungi admin untuk registrasi member.
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse">Kelas Tersedia</TabsTrigger>
            <TabsTrigger value="history">
              Request Saya
              {(historyData?.items ?? []).filter((r: any) => r.status === "PENDING_PAYMENT").length > 0 && (
                <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-xs">
                  {historyData!.items.filter((r: any) => r.status === "PENDING_PAYMENT").length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ══ TAB: Browse Kelas ══ */}
          <TabsContent value="browse" className="mt-4">
            {loadingBrowse ? (
              <div className="text-center py-12 text-muted-foreground">Memuat kelas...</div>
            ) : !browseData?.items.length ? (
              <div className="text-center py-12 text-muted-foreground">Belum ada kelas yang tersedia.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {browseData.items.map((cls) => (
                    <Card key={cls.id} className="flex flex-col">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base leading-tight">{cls.name}</CardTitle>
                          {cls.isFreeForMe ? (
                            <Badge className="bg-purple-500 text-white shrink-0">Gratis</Badge>
                          ) : (
                            <Badge variant="outline" className="shrink-0">
                              Rp {(cls.price ?? 0).toLocaleString("id-ID")}
                            </Badge>
                          )}
                        </div>
                        {cls.classType && (
                          <span className="text-xs text-muted-foreground">{cls.classType.name}</span>
                        )}
                      </CardHeader>
                      <CardContent className="flex-1 space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span>{format(new Date(cls.schedule), "EEEE, dd MMM yyyy HH:mm", { locale: localeId })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4 shrink-0" />
                          <span>{cls.duration} menit · {cls.instructorName ?? "Instruktur TBD"}</span>
                        </div>
                        {cls.limit !== null && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-4 h-4 shrink-0" />
                            <span>{cls.confirmedCount}/{cls.limit} peserta</span>
                            {cls.isFull && <Badge variant="destructive" className="text-xs">Penuh</Badge>}
                          </div>
                        )}

                        <div className="pt-2">
                          {cls.myRegistration ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-xs">{statusBadge(cls.myRegistration.status, false)}</span>
                            </div>
                          ) : cls.isFull ? (
                            <Button size="sm" variant="outline" disabled className="w-full">Kelas Penuh</Button>
                          ) : !browseData.isMember ? (
                            <Button size="sm" variant="outline" disabled className="w-full">Perlu Jadi Member</Button>
                          ) : (
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => { setSelectedClass(cls); setRequestOpen(true); }}
                            >
                              Request Ikut Kelas
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {totalBrowsePages > 1 && (
                  <div className="flex justify-center items-center gap-3 mt-6">
                    <Button variant="outline" size="sm" disabled={browsePage === 1} onClick={() => setBrowsePage(p => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">Halaman {browsePage} / {totalBrowsePages}</span>
                    <Button variant="outline" size="sm" disabled={browsePage >= totalBrowsePages} onClick={() => setBrowsePage(p => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ══ TAB: Riwayat Request ══ */}
          <TabsContent value="history" className="mt-4">
            {loadingHistory ? (
              <div className="text-center py-12 text-muted-foreground">Memuat riwayat...</div>
            ) : !historyData?.items.length ? (
              <div className="text-center py-12 text-muted-foreground">Belum ada request class visit.</div>
            ) : (
              <>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kelas</TableHead>
                        <TableHead>Jadwal</TableHead>
                        <TableHead>Biaya</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Bukti Bayar</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.items.map((reg: any) => (
                        <TableRow key={reg.id}>
                          <TableCell>
                            <div className="font-medium">{reg.class.name}</div>
                            <div className="text-xs text-muted-foreground">{reg.class.instructorName}</div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(reg.class.schedule), "dd MMM yyyy HH:mm", { locale: localeId })}
                          </TableCell>
                          <TableCell>
                            {reg.isFree ? (
                              <Badge className="bg-purple-500 text-white">Gratis</Badge>
                            ) : (
                              <span className="text-sm">Rp {reg.paidAmount.toLocaleString("id-ID")}</span>
                            )}
                          </TableCell>
                          <TableCell>{statusBadge(reg.status, reg.isFree)}</TableCell>
                          <TableCell>
                            {reg.paymentProof ? (
                              <a href={reg.paymentProof} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
                                <ImageIcon className="w-3 h-3" /> Lihat
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : reg.status === "PENDING_PAYMENT" ? (
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                onClick={() => { setUploadReg(reg); setUploadOpen(true); }}>
                                <Upload className="w-3 h-3" /> Upload
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {reg.status === "PENDING_PAYMENT" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs"
                                disabled={cancelMut.isPending}
                                onClick={() => cancelMut.mutate({ registrationId: reg.id })}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Batal
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>

                {totalHistoryPages > 1 && (
                  <div className="flex justify-center items-center gap-3 mt-4">
                    <Button variant="outline" size="sm" disabled={historyPage === 1} onClick={() => setHistoryPage(p => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">Halaman {historyPage} / {totalHistoryPages}</span>
                    <Button variant="outline" size="sm" disabled={historyPage >= totalHistoryPages} onClick={() => setHistoryPage(p => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* ══ DIALOG: Konfirmasi Request ══ */}
        <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Ikut Kelas</DialogTitle>
            </DialogHeader>
            {selectedClass && (
              <div className="space-y-4 py-2">
                <div className="rounded-lg border p-4 space-y-2 text-sm">
                  <div className="font-semibold text-base">{selectedClass.name}</div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(selectedClass.schedule), "EEEE, dd MMM yyyy HH:mm", { locale: localeId })}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {selectedClass.duration} menit · {selectedClass.instructorName ?? "Instruktur TBD"}
                  </div>
                  <div className="flex items-center gap-2 font-medium mt-2">
                    <DollarSign className="w-4 h-4" />
                    {selectedClass.isFreeForMe ? (
                      <span className="text-purple-600">Gratis (kamu punya membership aktif)</span>
                    ) : (
                      <span>Rp {(selectedClass.price ?? 0).toLocaleString("id-ID")}</span>
                    )}
                  </div>
                </div>

                {!selectedClass.isFreeForMe && (
                  <p className="text-sm text-muted-foreground">
                    Setelah request dikirim, kamu perlu transfer dan upload bukti pembayaran. Admin akan mengkonfirmasi pendaftaranmu.
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setRequestOpen(false)}>Batal</Button>
              <Button
                disabled={requestMut.isPending}
                onClick={() => selectedClass && requestMut.mutate({ classId: selectedClass.id })}
              >
                {requestMut.isPending ? "Memproses..." : "Kirim Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══ DIALOG: Upload Bukti Pembayaran ══ */}
        <Dialog open={uploadOpen} onOpenChange={(o) => { setUploadOpen(o); if (!o) { setProofFile(null); setProofPreview(null); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Bukti Pembayaran</DialogTitle>
            </DialogHeader>
            {uploadReg && (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  Kelas: <strong>{uploadReg.class?.name}</strong><br />
                  Jumlah: <strong>Rp {uploadReg.paidAmount?.toLocaleString("id-ID")}</strong>
                </p>

                <div>
                  <Label>File Bukti (JPG/PNG/PDF, maks 5MB)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button variant="outline" className="mt-2 w-full" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    {proofFile ? proofFile.name : "Pilih File"}
                  </Button>
                  {proofPreview && (
                    <img src={proofPreview} alt="Preview" className="mt-3 max-h-48 rounded border object-contain w-full" />
                  )}
                  {proofFile && !proofPreview && (
                    <p className="mt-2 text-xs text-muted-foreground">File siap diupload: {proofFile.name}</p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Batal</Button>
              <Button disabled={!proofFile || uploading} onClick={handleUploadProof}>
                {uploading ? "Mengupload..." : "Upload Bukti"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </ProtectedRoute>
  );
}
