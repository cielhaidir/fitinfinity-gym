import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { TrainerSession } from '@prisma/client';

interface SessionWithTrainer extends TrainerSession {
  trainer?: {
    user?: {
      name: string;
    };
  };
}

interface SessionDetailModalProps {
  session: SessionWithTrainer | null;
  onClose: () => void;
}

export default function SessionDetailModal({ session, onClose }: SessionDetailModalProps) {
  if (!session) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#232323] p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Detail Sesi Latihan</h2>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-gray-400 block mb-1">Trainer</label>
            <p className="text-white font-semibold">{session.trainer?.user?.name || 'Personal Trainer'}</p>
          </div>

          <div>
            <label className="text-gray-400 block mb-1">Tanggal</label>
            <p className="text-white">
              {format(new Date(session.date), 'EEEE, d MMMM yyyy', { locale: id })}
            </p>
          </div>

          <div>
            <label className="text-gray-400 block mb-1">Waktu</label>
            <p className="text-white">
              {format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}
            </p>
          </div>

          {session.description && (
            <div>
              <label className="text-gray-400 block mb-1">Deskripsi</label>
              <p className="text-white">{session.description}</p>
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white"
            >
              Tutup
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 