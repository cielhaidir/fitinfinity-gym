import { format } from "date-fns";

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
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SessionDetailModal({ session, isOpen, onClose }: SessionDetailModalProps) {
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
            <label className="text-sm text-muted-foreground">Member</label>
            <p className="font-medium">{session?.member?.user?.name || "-"}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Email Member</label>
            <p className="font-medium">{session?.member?.user?.email || "-"}</p>
          </div>


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
            <p className="font-medium">{session?.status || "-"}</p>
          </div>

          {session?.status === "ENDED" && session?.exerciseResult && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Hasil Latihan
              </label>
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
