import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, X } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useState } from "react";

interface SessionWithTrainer {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  description: string | null;
  exerciseResult: string | null;
  trainer: {
    user: {
      name: string;
      email: string;
    };
  };
}

interface SessionDetailModalProps {
  session: SessionWithTrainer | null;
  onClose: () => void;
}

export function SessionDetailModal({
  session,
  onClose,
}: SessionDetailModalProps) {
  const [showImageModal, setShowImageModal] = useState(false);

  if (!session) return null;

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Detail Sesi Latihan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <h3 className="font-medium text-sm sm:text-base">Trainer</h3>
              <p className="text-muted-foreground text-sm">
                {session.trainer.user.name}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-sm sm:text-base">Tanggal</h3>
              <p className="text-muted-foreground text-sm">
                {format(new Date(session.date), "EEEE, d MMMM yyyy", {
                  locale: id,
                })}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-sm sm:text-base">Waktu</h3>
              <p className="text-muted-foreground text-sm">
                {format(new Date(session.startTime), "HH:mm")} -{" "}
                {format(new Date(session.endTime), "HH:mm")}
              </p>
            </div>
            {session.description && (
              <div>
                <h3 className="font-medium text-sm sm:text-base">Deskripsi</h3>
                <p className="text-muted-foreground text-sm break-words">{session.description}</p>
              </div>
            )}
            {session.exerciseResult && (
              <div>
                <h3 className="font-medium text-sm sm:text-base">Hasil Latihan</h3>
                <Button
                  variant="outline"
                  className="mt-2 w-full text-sm"
                  onClick={() => setShowImageModal(true)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Lihat Hasil Latihan
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Hasil Latihan</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 z-10"
              onClick={() => setShowImageModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="mt-4 max-h-[70vh] overflow-auto">
              {session.exerciseResult?.endsWith(".pdf") ? (
                <iframe
                  src={session.exerciseResult}
                  className="h-[60vh] sm:h-[70vh] w-full border-0"
                  title="Exercise Result PDF"
                />
              ) : (
                <img
                  src={session.exerciseResult || ""}
                  alt="Exercise Result"
                  className="h-auto max-h-[60vh] sm:max-h-[70vh] w-full object-contain rounded-md"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
