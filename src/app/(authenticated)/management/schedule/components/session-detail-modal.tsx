import { format, startOfMonth } from "date-fns";
import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SessionDetailModalProps {
  session: {
    id: string;
    date: Date;
    startTime: Date;
    endTime: Date;
    status: string;
    member: {
      id: string;
      user: {
        id: string;
        name: string;
        email: string;
      };
    };
    trainer: {
      id: string;
      user: {
        id: string;
        name: string;
        email: string;
      };
    };
    exerciseResult?: string | null;
    type?: string;
    groupName?: string;
    attendanceCount?: number | null;
    isGroup?: boolean;
    description?: string | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (action?: string, session?: any) => void; // Callback to refresh data after update
}

export function SessionDetailModal({ session, isOpen, onClose, onUpdate }: SessionDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingAttendanceCount, setEditingAttendanceCount] = useState(
    session?.attendanceCount || 1
  );
  const [isEditingDateTime, setIsEditingDateTime] = useState(false);
  const [editingDate, setEditingDate] = useState("");
  const [editingStartTime, setEditingStartTime] = useState("");
  const [editingEndTime, setEditingEndTime] = useState("");

  const updateAttendanceMutation = api.managerCalendar.updateAttendanceCount.useMutation({
    onSuccess: () => {
      toast.success("Jumlah peserta berhasil diupdate");
      setIsEditing(false);
      onUpdate?.(); // Refresh data
    },
    onError: (error) => {
      toast.error(error.message || "Gagal mengupdate jumlah peserta");
    },
  });

  const cancelScheduleMutation = api.managerCalendar.cancelSchedule.useMutation({
    onSuccess: () => {
      toast.success("Sesi berhasil dibatalkan");
      onClose();
      onUpdate?.(); // Refresh data
    },
    onError: (error) => {
      toast.error(error.message || "Gagal membatalkan sesi");
    },
  });

  const restoreScheduleMutation = api.managerCalendar.restoreSchedule.useMutation({
    onSuccess: () => {
      toast.success("Sesi berhasil dikembalikan dan quota bertambah +1");
      onClose();
      onUpdate?.(); // Refresh data
    },
    onError: (error) => {
      toast.error(error.message || "Gagal mengembalikan sesi");
    },
  });

  const updateScheduleMutation = api.managerCalendar.updateSchedule.useMutation({
    onSuccess: () => {
      toast.success("Jadwal berhasil diupdate");
      setIsEditingDateTime(false);
      onUpdate?.(); // Refresh data
    },
    onError: (error) => {
      toast.error(error.message || "Gagal mengupdate jadwal");
    },
  });

  const handleUpdateAttendance = async () => {
    if (!session?.id || editingAttendanceCount < 1) {
      toast.error("Jumlah peserta minimal 1");
      return;
    }

    await updateAttendanceMutation.mutateAsync({
      sessionId: session.id,
      attendanceCount: editingAttendanceCount,
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingAttendanceCount(session?.attendanceCount || 1);
  };

  const handleEditDateTime = () => {
    if (!session) return;
    
    // Format dates for inputs
    const date = new Date(session.date);
    const startTime = new Date(session.startTime);
    const endTime = new Date(session.endTime);
    
    setEditingDate(format(date, "yyyy-MM-dd"));
    setEditingStartTime(format(startTime, "HH:mm"));
    setEditingEndTime(format(endTime, "HH:mm"));
    setIsEditingDateTime(true);
  };

  const handleUpdateDateTime = async () => {
    if (!session?.id || !editingDate || !editingStartTime || !editingEndTime) {
      toast.error("Semua field harus diisi");
      return;
    }

    // Parse the date and times
    const [year, month, day] = editingDate.split("-").map(Number);
    const [startHour, startMinute] = editingStartTime.split(":").map(Number);
    const [endHour, endMinute] = editingEndTime.split(":").map(Number);

    // Create date objects
    const newDate = new Date(year!, month! - 1, day);
    const newStartTime = new Date(year!, month! - 1, day, startHour, startMinute);
    const newEndTime = new Date(year!, month! - 1, day, endHour, endMinute);

    // Validate end time is after start time
    if (newEndTime <= newStartTime) {
      toast.error("Waktu selesai harus setelah waktu mulai");
      return;
    }

    try {
      await updateScheduleMutation.mutateAsync({
        sessionId: session.id,
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
      });
    } catch (error) {
      // Error handled by onError callback
    }
  };

  const handleCancelDateTimeEdit = () => {
    setIsEditingDateTime(false);
    setEditingDate("");
    setEditingStartTime("");
    setEditingEndTime("");
  };

  // Calculate minimum date (start of current session's month)
  const getMinDate = () => {
    if (!session?.date) return format(new Date(), "yyyy-MM-dd");
    const minDate = startOfMonth(new Date(session.date));
    return format(minDate, "yyyy-MM-dd");
  };

  if (!session) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${isOpen ? "" : "hidden"}`}
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-50 w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          Detail Sesi
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Tipe Sesi</label>
            <p className="font-medium">
              {session?.type === "group" ? "Group Training" : "Individual Training"}
            </p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              {session?.type === "group" ? "Nama Group" : "Member"}
            </label>
            <p className="font-medium">
              {session?.type === "group"
                ? session?.groupName && session.groupName.toLowerCase().includes("group")
                  ? session.groupName
                  : `${session.groupName ?? "Group"} Training`
                : session?.member?.user?.name || "-"}
            </p>
          </div>

          {session?.type === "group" && (
            <div>
              <label className="text-sm text-muted-foreground">Jumlah Peserta</label>
              {isEditing ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editingAttendanceCount}
                    onChange={(e) => setEditingAttendanceCount(parseInt(e.target.value) || 1)}
                    className="w-20 px-2 py-1 text-sm border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-sm text-muted-foreground">orang</span>
                  <button
                    onClick={handleUpdateAttendance}
                    disabled={updateAttendanceMutation.isPending}
                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {updateAttendanceMutation.isPending ? "..." : "✓"}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    ✗
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <p className="font-medium text-blue-600">
                    {session.attendanceCount || 0} orang
                  </p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          )}

          {session?.type !== "group" && (
            <div>
              <label className="text-sm text-muted-foreground">Email Member</label>
              <p className="font-medium">{session?.member?.user?.email || "-"}</p>
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground">Trainer</label>
            <p className="font-medium">{session?.trainer?.user?.name || "-"}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Tanggal & Waktu</label>
            {isEditingDateTime ? (
              <div className="space-y-2 mt-1">
                <div>
                  <input
                    type="date"
                    value={editingDate}
                    min={getMinDate()}
                    onChange={(e) => setEditingDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Mulai</label>
                    <input
                      type="time"
                      value={editingStartTime}
                      onChange={(e) => setEditingStartTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Selesai</label>
                    <input
                      type="time"
                      value={editingEndTime}
                      onChange={(e) => setEditingEndTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Hanya dapat memilih tanggal di bulan yang sama atau bulan berikutnya
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateDateTime}
                    disabled={updateScheduleMutation.isPending}
                    className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {updateScheduleMutation.isPending ? "Menyimpan..." : "✓ Simpan"}
                  </button>
                  <button
                    onClick={handleCancelDateTimeEdit}
                    className="px-3 py-1.5 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    ✗ Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1">
                <p className="font-medium">
                  {session?.date ? format(new Date(session.date), "dd/MM/yyyy") : "-"}
                  {" • "}
                  {session?.startTime ? format(new Date(session.startTime), "HH:mm") : "-"} - {session?.endTime ? format(new Date(session.endTime), "HH:mm") : "-"}
                </p>
                <button
                  onClick={handleEditDateTime}
                  className="mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Edit Jadwal
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Status</label>
            <p className={`font-medium ${
              session?.status === "ENDED"
                ? "text-green-600"
                : session?.status === "CANCELED"
                ? "text-red-600"
                : session?.status === "ONGOING"
                ? "text-blue-600"
                : "text-yellow-600"
            }`}>
              {session?.status === "ENDED" ? "✓ Selesai" :
               session?.status === "CANCELED" ? "✗ Dibatalkan" :
               session?.status === "ONGOING" ? "🔄 Sedang Berlangsung" :
               session?.status || "Belum Dimulai"}
            </p>
          </div>

          {session?.description && (
            <div>
              <label className="text-sm text-muted-foreground">Deskripsi</label>
              <p className="font-medium text-sm">{session.description}</p>
            </div>
          )}

          {session?.exerciseResult && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                📋 Hasil Latihan
              </label>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md border border-green-200">
                <span className="text-sm text-green-700">✓ Hasil latihan tersedia</span>
                <a
                  href={session.exerciseResult}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Lihat Detail
                </a>
              </div>
            </div>
          )}

          {session?.status === "ENDED" && !session?.exerciseResult && (
            <div className="p-2 bg-yellow-50 rounded-md border border-yellow-200">
              <span className="text-sm text-yellow-700">⚠️ Hasil latihan belum diupload</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                // Trigger edit mode - this will be handled by parent
                if (onUpdate) {
                  (onUpdate as any)('edit', session);
                }
              }}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            
            {session.status !== "CANCELED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (confirm('Apakah Anda yakin ingin membatalkan sesi ini?')) {
                    try {
                      await cancelScheduleMutation.mutateAsync({
                        sessionId: session.id,
                      });
                    } catch (error) {
                      // Error is handled by onError callback
                    }
                  }
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={cancelScheduleMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {cancelScheduleMutation.isPending ? "Membatalkan..." : "Batalkan Sesi"}
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (confirm('Apakah Anda yakin ingin mengembalikan sesi ini? Quota member akan bertambah +1.')) {
                  try {
                    await restoreScheduleMutation.mutateAsync({
                      sessionId: session.id,
                    });
                  } catch (error) {
                    // Error is handled by onError callback
                  }
                }
              }}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
              disabled={restoreScheduleMutation.isPending}
            >
              <Pencil className="h-4 w-4 mr-2" />
              {restoreScheduleMutation.isPending ? "Mengembalikan..." : "Kembalikan Sesi"}
            </Button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
