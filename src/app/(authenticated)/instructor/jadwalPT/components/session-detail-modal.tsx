import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface SessionDetailModalProps {
  session: {
    id: string;
    member: {
      user: {
        name: string;
      };
    };
    startTime: Date;
    endTime: Date;
    description: string;
  };
  onClose: () => void;
  onDelete: (sessionId: string) => void;
}

export default function SessionDetailModal({ session, onClose, onDelete }: SessionDetailModalProps) {
  const handleDelete = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) {
      onDelete(session.id);
    }
  };

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
            <label className="text-gray-400 block mb-1">Member</label>
            <p className="text-white font-semibold">{session.member.user.name}</p>
          </div>

          <div>
            <label className="text-gray-400 block mb-1">Waktu</label>
            <p className="text-white">
              {format(new Date(session.startTime), 'EEEE, d MMMM yyyy')}
            </p>
            <p className="text-white">
              {format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}
            </p>
          </div>

          <div>
            <label className="text-gray-400 block mb-1">Deskripsi</label>
            <p className="text-white">{session.description || '-'}</p>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus Jadwal
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Tutup
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 