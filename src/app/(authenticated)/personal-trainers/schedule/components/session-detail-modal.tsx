import { format } from "date-fns";
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
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (sessionId: string) => void;
  onCancel?: (sessionId: string) => void;
}

export function SessionDetailModal({
  session,
  isOpen,
  onClose,
  onDelete,
  onCancel,
}: SessionDetailModalProps) {
  if (!session) return null;

  const [isUploading, setIsUploading] = useState(false);
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
            <label className="text-sm text-muted-foreground">Tanggal</label>
            <p className="font-medium">
              {new Date(session.date).toLocaleDateString()}
            </p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Waktu</label>
            <p className="font-medium">
              {new Date(session.startTime).toLocaleTimeString()} -{" "}
              {new Date(session.endTime).toLocaleTimeString()}
            </p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Status</label>
            <p className="font-medium">{session.status}</p>
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
