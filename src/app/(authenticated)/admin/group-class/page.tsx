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
import { Textarea } from "@/components/ui/textarea";
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
  Plus,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  Clock,
  Dumbbell,
  Ban,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Combobox } from "@/components/ui/combobox";

const statusBadge = (status: string) => {
  switch (status) {
    case "SCHEDULED": return <Badge variant="outline" className="border-blue-500 text-blue-600">Terjadwal</Badge>;
    case "ONGOING":   return <Badge className="bg-yellow-500 text-white">Berlangsung</Badge>;
    case "ENDED":     return <Badge className="bg-green-500 text-white">Selesai</Badge>;
    case "CANCELLED": return <Badge variant="destructive">Dibatalkan</Badge>;
    default:          return <Badge variant="secondary">{status}</Badge>;
  }
};

const attendanceBadge = (attended: boolean | null) => {
  if (attended === true)  return <Badge className="bg-green-500 text-white">Hadir</Badge>;
  if (attended === false) return <Badge variant="destructive">Tidak Hadir</Badge>;
  return <Badge variant="outline">Belum Dicek</Badge>;
};

export default function GroupClassPage() {
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [formGroupSubId, setFormGroupSubId] = useState("");
  const [formTrainerId, setFormTrainerId] = useState("");
  const [formClassTypeId, setFormClassTypeId] = useState("");
  const [formSchedule, setFormSchedule] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formDuration, setFormDuration] = useState("60");
  const [formDescription, setFormDescription] = useState("");

  // Attendance dialog
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendanceData, setAttendanceData] = useState<Record<string, boolean>>({});
  const [lokerData, setLokerData] = useState<Record<string, string>>({});
  const [handukData, setHandukData] = useState<Record<string, string>>({});
  const [checkInTimeData, setCheckInTimeData] = useState<Record<string, string>>({});

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // ─── Queries ─────────────────────────────────────────────────────────
  const { data: listData, isLoading: loadingList, refetch: refetchList } =
    api.groupClass.list.useQuery({
      filter,
      pageSize: 50,
      dateFrom: dateFrom ? new Date(dateFrom + "T00:00:00") : undefined,
      dateTo: dateTo ? new Date(dateTo + "T23:59:59") : undefined,
    });

  const { data: detail, isLoading: loadingDetail, refetch: refetchDetail } =
    api.groupClass.getById.useQuery(
      { id: selectedId! },
      { enabled: !!selectedId },
    );

  const { data: groupSubs, isLoading: loadingGroupSubs } =
    api.groupClass.listGroupSubscriptions.useQuery(undefined, {
      enabled: createOpen,
    });

  const { data: classTypes } = api.classType.list.useQuery(undefined, {
    enabled: createOpen,
  });

  const { data: trainers } = api.personalTrainer.listAllActive.useQuery(undefined, {
    enabled: createOpen,
  });

  // ─── Mutations ───────────────────────────────────────────────────────
  const createMut = api.groupClass.create.useMutation({
    onSuccess: () => {
      toast.success("Group Class berhasil dibuat");
      setCreateOpen(false);
      resetForm();
      refetchList();
    },
    onError: (err) => toast.error(err.message),
  });

  const attendanceMut = api.groupClass.markAttendance.useMutation({
    onSuccess: () => {
      toast.success("Kehadiran berhasil disimpan");
      setAttendanceOpen(false);
      setAttendanceData({});
      refetchDetail();
      refetchList();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelMut = api.groupClass.cancel.useMutation({
    onSuccess: () => {
      toast.success("Group Class berhasil dibatalkan, sesi di-refund");
      setCancelOpen(false);
      setCancelReason("");
      refetchDetail();
      refetchList();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setFormGroupSubId("");
    setFormTrainerId("");
    setFormClassTypeId("");
    setFormSchedule("");
    setFormEndTime("");
    setFormDuration("60");
    setFormDescription("");
  };

  const handleCreate = () => {
    if (!formGroupSubId || !formTrainerId || !formSchedule || !formEndTime) {
      toast.error("Lengkapi semua field wajib");
      return;
    }
    createMut.mutate({
      groupSubscriptionId: formGroupSubId,
      trainerId: formTrainerId,
      classTypeId: formClassTypeId || undefined,
      schedule: new Date(formSchedule),
      endTime: new Date(formEndTime),
      duration: parseInt(formDuration) || 60,
      description: formDescription || undefined,
    });
  };

  const openAttendance = () => {
    if (!detail) return;
    const initial: Record<string, boolean> = {};
    const initialLoker: Record<string, string> = {};
    const initialHanduk: Record<string, string> = {};
    const initialCheckIn: Record<string, string> = {};
    detail.attendances.forEach((a: any) => {
      initial[a.memberId] = a.attended ?? false;
      initialLoker[a.memberId] = a.lokerNumber ?? "";
      initialHanduk[a.memberId] = a.handukType ?? "None";
      initialCheckIn[a.memberId] = a.checkInTime
        ? format(new Date(a.checkInTime), "HH:mm")
        : format(new Date(), "HH:mm");
    });
    setAttendanceData(initial);
    setLokerData(initialLoker);
    setHandukData(initialHanduk);
    setCheckInTimeData(initialCheckIn);
    setAttendanceOpen(true);
  };

  const handleSaveAttendance = () => {
    if (!selectedId) return;
    attendanceMut.mutate({
      groupClassId: selectedId,
      attendances: Object.entries(attendanceData).map(([memberId, attended]) => {
        const timeStr = checkInTimeData[memberId];
        let checkInTime: string | undefined;
        if (attended && timeStr) {
          const today = format(new Date(), "yyyy-MM-dd");
          checkInTime = new Date(`${today}T${timeStr}:00`).toISOString();
        }
        return {
          memberId,
          attended,
          lokerNumber: lokerData[memberId] || undefined,
          handuk: handukData[memberId] || undefined,
          checkInTime,
        };
      }),
    });
  };

  // ─── DETAIL VIEW ─────────────────────────────────────────────────────
  if (selectedId && detail) {
    return (
      <ProtectedRoute requiredPermissions={["create:session"]}>
        <div className="container mx-auto py-6 space-y-6">
          <Button variant="ghost" onClick={() => setSelectedId(null)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
          </Button>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Dumbbell className="w-6 h-6" />
                {detail.classType?.name ?? "Group Class"}
              </h1>
              <p className="text-muted-foreground">
                Group: {detail.groupSubscription.groupName ?? "Unnamed Group"}
              </p>
            </div>
            <div className="flex gap-2">
              {statusBadge(detail.status)}
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" /> Jadwal
                </div>
                <p className="font-medium">
                  {format(new Date(detail.schedule), "EEEE, dd MMM yyyy", { locale: localeId })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(detail.schedule), "HH:mm")} – {format(new Date(detail.endTime), "HH:mm")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" /> Durasi
                </div>
                <p className="font-medium">{detail.duration} menit</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Dumbbell className="w-4 h-4" /> Trainer
                </div>
                <p className="font-medium">{detail.trainer.user.name}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Users className="w-4 h-4" /> Sisa Sesi
                </div>
                <p className="font-medium">
                  {(detail.groupSubscription.leadSubscription.remainingSessions ?? 0) +
                    (detail.groupSubscription.leadSubscription.remainingBonusSessions ?? 0)} sesi
                </p>
              </CardContent>
            </Card>
          </div>

          {detail.description && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground mb-1">Deskripsi</p>
                <p>{detail.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Attendance Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Daftar Kehadiran</CardTitle>
              {detail.status === "SCHEDULED" && (
                <div className="flex gap-2">
                  <Button onClick={openAttendance}>
                    <CheckCircle className="w-4 h-4 mr-1" /> Absen
                  </Button>
                  <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                    <Ban className="w-4 h-4 mr-1" /> Batalkan
                  </Button>
                </div>
              )}
              {detail.status === "ENDED" && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={openAttendance}>
                    Edit Kehadiran
                  </Button>
                  <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                    <Ban className="w-4 h-4 mr-1" /> Batalkan
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Jam</TableHead>
                    <TableHead>Loker</TableHead>
                    <TableHead>Handuk</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.attendances.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.member.user.name ?? "-"}</TableCell>
                      <TableCell>{a.member.user.email ?? "-"}</TableCell>
                      <TableCell>
                        {a.checkInTime ? format(new Date(a.checkInTime), "HH:mm") : "-"}
                      </TableCell>
                      <TableCell>{a.lokerNumber ?? "-"}</TableCell>
                      <TableCell>
                        {a.handukType === "Small" ? "Kecil" : a.handukType === "Large" ? "Besar" : "-"}
                      </TableCell>
                      <TableCell>{attendanceBadge(a.attended)}</TableCell>
                    </TableRow>
                  ))}
                  {detail.attendances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Tidak ada peserta
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {detail.cancelReason && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground mb-1">Alasan Pembatalan</p>
                <p>{detail.cancelReason}</p>
              </CardContent>
            </Card>
          )}

          {detail.creator && (
            <p className="text-xs text-muted-foreground">Dibuat oleh: {detail.creator.name}</p>
          )}

          {/* ─── Attendance Dialog ─── */}
          <Dialog open={attendanceOpen} onOpenChange={setAttendanceOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Absen Kehadiran & Fasilitas</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {detail.attendances.map((a) => (
                  <div key={a.memberId} className="p-3 rounded border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{a.member.user.name ?? "Unknown"}</span>
                      <ToggleGroup
                        type="single"
                        value={attendanceData[a.memberId] === true ? "yes" : attendanceData[a.memberId] === false ? "no" : ""}
                        onValueChange={(val) => {
                          if (val) {
                            setAttendanceData((prev) => ({ ...prev, [a.memberId]: val === "yes" }));
                          }
                        }}
                      >
                        <ToggleGroupItem value="yes" className="data-[state=on]:bg-green-500 data-[state=on]:text-white">
                          <CheckCircle className="w-4 h-4 mr-1" /> Hadir
                        </ToggleGroupItem>
                        <ToggleGroupItem value="no" className="data-[state=on]:bg-red-500 data-[state=on]:text-white">
                          <XCircle className="w-4 h-4 mr-1" /> Absen
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    {/* Loker, Handuk, Jam - only show when marked as attended */}
                    {attendanceData[a.memberId] === true && (
                      <div className="grid grid-cols-3 gap-2 pl-1">
                        <div>
                          <Label className="text-xs text-muted-foreground">Jam Hadir</Label>
                          <Input
                            type="time"
                            value={checkInTimeData[a.memberId] ?? ""}
                            onChange={(e) => setCheckInTimeData((prev) => ({ ...prev, [a.memberId]: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">No. Loker</Label>
                          <Input
                            placeholder="Contoh: 12"
                            value={lokerData[a.memberId] ?? ""}
                            onChange={(e) => setLokerData((prev) => ({ ...prev, [a.memberId]: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Handuk</Label>
                          <Select
                            value={handukData[a.memberId] ?? "None"}
                            onValueChange={(val) => setHandukData((prev) => ({ ...prev, [a.memberId]: val }))}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="None">Tidak</SelectItem>
                              <SelectItem value="Small">Kecil</SelectItem>
                              <SelectItem value="Large">Besar</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAttendanceOpen(false)}>Batal</Button>
                <Button onClick={handleSaveAttendance} disabled={attendanceMut.isPending}>
                  {attendanceMut.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ─── Cancel Dialog ─── */}
          <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Batalkan Group Class</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Pilih tindakan pembatalan:
              </p>
              <div className="grid grid-cols-1 gap-3 p-2">
                <div className="rounded-md border p-3 space-y-1">
                  <p className="text-sm font-medium">Batalkan Sesi (Sesi Hangus)</p>
                  <p className="text-xs text-muted-foreground">Conduct tetap terhitung, sesi tidak dikembalikan</p>
                </div>
                <div className="rounded-md border p-3 space-y-1">
                  <p className="text-sm font-medium">Kembalikan Sesi (Refund)</p>
                  <p className="text-xs text-muted-foreground">Conduct tidak dihitung, sesi dikembalikan ke member</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Alasan (opsional)</Label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Masukkan alasan pembatalan..."
                />
              </div>
              <DialogFooter className="flex gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => setCancelOpen(false)}>Batal</Button>
                <Button
                  variant="destructive"
                  onClick={() => cancelMut.mutate({ groupClassId: selectedId!, cancelReason: cancelReason || undefined, refundSession: false })}
                  disabled={cancelMut.isPending}
                >
                  Batalkan Sesi
                </Button>
                <Button
                  variant="default"
                  onClick={() => cancelMut.mutate({ groupClassId: selectedId!, cancelReason: cancelReason || undefined, refundSession: true })}
                  disabled={cancelMut.isPending}
                >
                  Kembalikan Sesi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ProtectedRoute>
    );
  }

  // ─── LIST VIEW ───────────────────────────────────────────────────────
  return (
    <ProtectedRoute requiredPermissions={["create:session"]}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Group Class</h1>
            <p className="text-muted-foreground">Kelola jadwal kelas private untuk group</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Buat Group Class
          </Button>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap items-end gap-4">
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(val) => {
              if (val) {
                setFilter(val as any);
                setDateFrom("");
                setDateTo("");
              }
            }}
          >
            <ToggleGroupItem value="upcoming">Upcoming</ToggleGroupItem>
            <ToggleGroupItem value="past">Past</ToggleGroupItem>
            <ToggleGroupItem value="all">All</ToggleGroupItem>
          </ToggleGroup>

          <div className="flex items-end gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Dari</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 w-[150px]"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Sampai</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 w-[150px]"
              />
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="pt-4">
            {loadingList ? (
              <p className="text-center text-muted-foreground py-8">Memuat data...</p>
            ) : !listData?.items.length ? (
              <p className="text-center text-muted-foreground py-8">Belum ada Group Class</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group</TableHead>
                    <TableHead>Jenis Kelas</TableHead>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Jadwal</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Peserta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listData.items.map((gc) => (
                    <TableRow key={gc.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedId(gc.id)}>
                      <TableCell className="font-medium">{gc.groupSubscription.groupName ?? "Unnamed"}</TableCell>
                      <TableCell>{gc.classType?.name ?? "-"}</TableCell>
                      <TableCell>{gc.trainer.user.name}</TableCell>
                      <TableCell>
                        <div>{format(new Date(gc.schedule), "dd MMM yyyy", { locale: localeId })}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(gc.schedule), "HH:mm")} – {format(new Date(gc.endTime), "HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell>{gc.duration} min</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {gc.attendanceSummary.attended}/{gc.attendanceSummary.total}
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(gc.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Detail</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ─── Create Dialog ─── */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Buat Group Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Group Subscription */}
              <div className="space-y-1">
                <Label>Group Subscription *</Label>
                <Combobox
                  options={(groupSubs ?? []).map((gs) => ({
                    value: gs.id,
                    label: `${gs.groupName ?? `Group - ${gs.leadSubscription.member.user.name}`} (${(gs.leadSubscription.remainingSessions ?? 0) + (gs.leadSubscription.remainingBonusSessions ?? 0)} sesi)`,
                  }))}
                  value={formGroupSubId}
                  onValueChange={setFormGroupSubId}
                  placeholder={loadingGroupSubs ? "Memuat..." : "Pilih Group"}
                  searchPlaceholder="Cari group..."
                  emptyMessage="Group tidak ditemukan."
                />
              </div>

              {/* Trainer */}
              <div className="space-y-1">
                <Label>Trainer *</Label>
                <Combobox
                  options={(trainers ?? []).map((t: any) => ({
                    value: t.id,
                    label: t.user?.name ?? "Unknown",
                  }))}
                  value={formTrainerId}
                  onValueChange={setFormTrainerId}
                  placeholder="Pilih Trainer"
                  searchPlaceholder="Cari trainer..."
                  emptyMessage="Trainer tidak ditemukan."
                />
              </div>

              {/* Class Type */}
              <div className="space-y-1">
                <Label>Jenis Kelas (opsional)</Label>
                <Combobox
                  options={(classTypes ?? []).map((ct: any) => ({
                    value: ct.id,
                    label: ct.name,
                  }))}
                  value={formClassTypeId}
                  onValueChange={setFormClassTypeId}
                  placeholder="Pilih jenis kelas"
                  searchPlaceholder="Cari jenis kelas..."
                  emptyMessage="Jenis kelas tidak ditemukan."
                />
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Jadwal Mulai *</Label>
                  <Input
                    type="datetime-local"
                    value={formSchedule}
                    onChange={(e) => setFormSchedule(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Jadwal Selesai *</Label>
                  <Input
                    type="datetime-local"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-1">
                <Label>Durasi (menit)</Label>
                <Input
                  type="number"
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  min={1}
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <Label>Deskripsi (opsional)</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Deskripsi group class..."
                />
              </div>

              {/* Group Members Preview */}
              {formGroupSubId && groupSubs && (
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Anggota yang akan didaftarkan:</Label>
                  <div className="border rounded p-2 space-y-1 max-h-32 overflow-y-auto">
                    {(() => {
                      const selected = groupSubs.find((g) => g.id === formGroupSubId);
                      if (!selected) return <p className="text-sm text-muted-foreground">-</p>;
                      const members = [
                        { name: selected.leadSubscription.member.user.name, role: "Lead" },
                        ...selected.groupMembers
                          .filter((gm) => gm.subscription.memberId !== selected.leadSubscription.memberId)
                          .map((gm) => ({ name: gm.subscription.member.user.name, role: "Member" })),
                      ];
                      return members.map((m, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span>{m.name ?? "Unknown"}</span>
                          <Badge variant="outline" className="text-xs">{m.role}</Badge>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Batal</Button>
              <Button onClick={handleCreate} disabled={createMut.isPending}>
                {createMut.isPending ? "Membuat..." : "Buat Group Class"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
