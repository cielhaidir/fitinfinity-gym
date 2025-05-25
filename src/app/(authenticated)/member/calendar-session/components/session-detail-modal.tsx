import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export function SessionDetailModal({ session, onClose }: SessionDetailModalProps) {
  const [showImageModal, setShowImageModal] = useState(false);

  if (!session) return null;

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Sesi Latihan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Trainer</h3>
              <p className="text-muted-foreground">{session.trainer.user.name}</p>
            </div>
            <div>
              <h3 className="font-medium">Tanggal</h3>
              <p className="text-muted-foreground">
                {format(new Date(session.date), 'EEEE, d MMMM yyyy', { locale: id })}
              </p>
            </div>
            <div>
              <h3 className="font-medium">Waktu</h3>
              <p className="text-muted-foreground">
                {format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}
              </p>
            </div>
            {session.description && (
              <div>
                <h3 className="font-medium">Deskripsi</h3>
                <p className="text-muted-foreground">{session.description}</p>
              </div>
            )}
            {session.exerciseResult && (
              <div>
                <h3 className="font-medium">Hasil Latihan</h3>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => setShowImageModal(true)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Lihat Hasil Latihan
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Hasil Latihan</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              onClick={() => setShowImageModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="mt-4">
              {session.exerciseResult?.endsWith('.pdf') ? (
                <iframe
                  src={session.exerciseResult}
                  className="w-full h-[80vh]"
                  title="Exercise Result PDF"
                />
              ) : (
                <img
                  src={session.exerciseResult || ''}
                  alt="Exercise Result"
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 