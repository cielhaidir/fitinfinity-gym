import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface SessionDetailModalProps {
  session: {
    trainer?: {
      user?: {
        name: string;
      };
    };
    startTime: string | Date;
    endTime: string | Date;
    description?: string;
  };
  onClose: () => void;
}

export default function SessionDetailModal({ session, onClose }: SessionDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#232323] p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Detail Sesi Latihan</h2>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-gray-600 dark:text-gray-400 block mb-1">Personal Trainer</label>
            <p className="text-gray-900 dark:text-white font-semibold">
              {session.trainer?.user?.name || 'Personal Trainer'}
            </p>
          </div>

          <div>
            <label className="text-gray-600 dark:text-gray-400 block mb-1">Waktu</label>
            <p className="text-gray-900 dark:text-white">
              {format(new Date(session.startTime), 'EEEE, d MMMM yyyy')}
            </p>
            <p className="text-gray-900 dark:text-white">
              {format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}
            </p>
          </div>

          <div>
            <label className="text-gray-600 dark:text-gray-400 block mb-1">Deskripsi</label>
            <p className="text-gray-900 dark:text-white">{session.description || '-'}</p>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Tutup
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 