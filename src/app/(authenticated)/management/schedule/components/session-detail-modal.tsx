import { format } from "date-fns";
import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

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
  onUpdate?: () => void; // Callback to refresh data after update
}

export function SessionDetailModal({ session, isOpen, onClose, onUpdate }: SessionDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingAttendanceCount, setEditingAttendanceCount] = useState(
    session?.attendanceCount || 1
  );

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
            <label className="text-sm text-muted-foreground">Tanggal</label>
            <p className="font-medium">
              {session?.date ? format(new Date(session.date), "dd/MM/yyyy") : "-"}
            </p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Waktu</label>
            <p className="font-medium">
              {session?.startTime ? format(new Date(session.startTime), "HH:mm") : "-"} - {session?.endTime ? format(new Date(session.endTime), "HH:mm") : "-"}
            </p>
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

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
