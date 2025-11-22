import { format, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { X, Upload } from "lucide-react";
import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

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
    exerciseResult?: string | null;
    isGroup?: boolean;
    attendanceCount?: number;
    type?: string;
    groupName?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (sessionId: string) => void;
  onCancel?: (sessionId: string) => void;
  onReschedule?: (sessionId: string, newDate: Date, newStartTime: Date, newEndTime: Date) => void;
}

export function SessionDetailModal({
  session,
  isOpen,
  onClose,
  onDelete,
  onCancel,
  onReschedule,
}: SessionDetailModalProps) {
  if (!session) return null;

  const [isUploading, setIsUploading] = useState(false);
  const [isEditingDateTime, setIsEditingDateTime] = useState(false);
  const [editingDate, setEditingDate] = useState("");
  const [editingStartTime, setEditingStartTime] = useState("");
  const [editingEndTime, setEditingEndTime] = useState("");
  const utils = api.useUtils();

  const updateSession = api.trainerSession.update.useMutation({
    onSuccess: () => {
      toast.success("Sesi berhasil diupdate");
      utils.trainerSession.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const uploadFileMutation = api.trainerSession.uploadFile.useMutation({
    onSuccess: () => {
      toast.success("File berhasil diupload");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      // Convert file to base64
      const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });
      };

      // Step 1: Upload the file using tRPC
      const base64Data = await fileToBase64(file);

      console.log("Uploading file for member:", session.member.id); // Debug log

      const uploadResult = await uploadFileMutation.mutateAsync({
        fileData: base64Data,
        fileName: file.name,
        fileType: file.type,
        memberId: session.member.id, // Use member.id instead of member.user.id
      });

      if (!uploadResult.success || !uploadResult.filePath) {
        throw new Error("File upload failed");
      }

      // Step 2: Update session with file path
      await updateSession.mutateAsync({
        id: session.id,
        date: new Date(session.date),
        startTime: new Date(session.startTime),
        endTime: new Date(session.endTime),
        exerciseResult: uploadResult.filePath,
      });

      toast.success("Hasil latihan berhasil diupload");
      utils.trainerSession.getAll.invalidate();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal mengupload hasil latihan",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const formatGender = (gender: string | null | undefined) => {
    if (!gender) return "-";
    switch (gender) {
      case "MALE":
        return "Laki-laki";
      case "FEMALE":
        return "Perempuan";
      case "OTHER":
        return "Lainnya";
      default:
        return "-";
    }
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
      if (onReschedule) {
        onReschedule(session.id, newDate, newStartTime, newEndTime);
        setIsEditingDateTime(false);
      } else {
        // Fallback to using the update mutation directly
        await updateSession.mutateAsync({
          id: session.id,
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
        });
        setIsEditingDateTime(false);
      }
    } catch (error) {
      toast.error("Gagal mengupdate jadwal");
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

  // Calculate hours until session
  const startTime = new Date(session.startTime);
  const now = new Date();
  const hoursUntilSession =
    (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isWithin12Hours = hoursUntilSession <= 12 && hoursUntilSession > 0;
  const isPast = hoursUntilSession <= 0;

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
            <label className="text-sm text-muted-foreground">Member</label>
            <p className="font-medium">{session.type === "group" ? (session.groupName ?? "Group") : session.member.user.name}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <p className="font-medium">{session.member.user.email}</p>
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
                    disabled={updateSession.isPending}
                    className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {updateSession.isPending ? "Menyimpan..." : "✓ Simpan"}
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
                  {format(new Date(session.date), "dd/MM/yyyy")}
                  {" • "}
                  {format(new Date(session.startTime), "HH:mm")} - {format(new Date(session.endTime), "HH:mm")}
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
            <p className="font-medium">{session.status}</p>
          </div>

          {session.isGroup && (
            <div>
              <label className="text-sm text-muted-foreground">Jumlah Peserta</label>
              <p className="font-medium">{session.attendanceCount || 1} peserta</p>
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground">Tipe Sesi</label>
            <p className="font-medium">
              {session.isGroup ? "Grup" : "Individual"}
            </p>
          </div>

          {session.status === "ENDED" && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Hasil Latihan
              </label>
              {session.exerciseResult ? (
                <div className="flex items-center gap-2">
                  <a
                    href={session.exerciseResult}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline"
                  >
                    Lihat Hasil Latihan
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="w-full"
                  />
                  {isUploading && (
                    <p className="text-sm text-muted-foreground">
                      Mengupload file...
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          {isWithin12Hours ? (
            <button
              onClick={() => onCancel?.(session.id)}
              className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-yellow-900 hover:bg-yellow-600"
            >
              Batalkan
            </button>
          ) : !isPast ? (
            <button
              onClick={() => onDelete(session.id)}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </button>
          ) : null}
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
