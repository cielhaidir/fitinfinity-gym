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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Detail Sesi</h2>
        <div className="space-y-4">
          <div>
            <p className="text-gray-600">Trainer</p>
            <p className="font-semibold">{session.trainer?.user?.name || 'Personal Trainer'}</p>
          </div>
          <div>
            <p className="text-gray-600">Tanggal</p>
            <p className="font-semibold">{new Date(session.date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Waktu</p>
            <p className="font-semibold">
              {new Date(session.startTime).toLocaleTimeString()} - {new Date(session.endTime).toLocaleTimeString()}
            </p>
          </div>
          {session.description && (
            <div>
              <p className="text-gray-600">Deskripsi</p>
              <p className="font-semibold">{session.description}</p>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-[#C9D953] text-black py-2 rounded hover:bg-[#d4e45e]"
        >
          Tutup
        </button>
      </div>
    </div>
  );
} 