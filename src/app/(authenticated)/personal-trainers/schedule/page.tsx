"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import { format, addWeeks, subWeeks, addMonths, subMonths } from "date-fns";
import { useSession } from "next-auth/react";
import Calendar from "./components/calendar";
import AppointmentForm from "./components/appointment-form";
import { toast } from "sonner";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function JadwalPTPage() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("weekly");

  const utils = api.useUtils();

  const { data: trainerSessions, isLoading } =
    api.trainerSession.getAll.useQuery(undefined, {
      enabled: !!session?.user,
    });

  // FIX: Remove onSuccess from here to prevent infinite loops.
  // Toasts and invalidation will be handled in the functions that call the mutation.
  const updateSession = api.trainerSession.update.useMutation({
    onError: (error) => {
      toast.error(`Gagal memperbarui jadwal: ${error.message}`);
    },
  });

  const deleteSession = api.trainerSession.delete.useMutation({
    onSuccess: () => {
      toast.success("Jadwal berhasil dihapus");
      utils.trainerSession.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Gagal menghapus jadwal: ${error.message}`);
    },
  });

  // Group sessions by date and time
  const sessionsByDateTime: Record<string, any[]> = {};
  const sessionsByDate: Record<string, any[]> = {};

  trainerSessions?.forEach((session) => {
    const dateStr = format(new Date(session.date), "yyyy-MM-dd");
    const timeStr = format(new Date(session.startTime), "HH:mm");
    const key = `${dateStr}-${timeStr}`;

    if (!sessionsByDateTime[key]) {
      sessionsByDateTime[key] = [];
    }
    if (!sessionsByDate[dateStr]) {
      sessionsByDate[dateStr] = [];
    }

    const sessionWithKey = {
      ...session,
      _key: `session-${session.id}-${dateStr}-${timeStr}`,
    };

    sessionsByDateTime[key].push(sessionWithKey);
    sessionsByDate[dateStr].push(sessionWithKey);
  });

  const handleNavigate = (direction: "prev" | "next") => {
    if (viewMode === "weekly") {
      setCurrentDate(
        direction === "prev"
          ? subWeeks(currentDate, 1)
          : addWeeks(currentDate, 1),
      );
    } else {
      setCurrentDate(
        direction === "prev"
          ? subMonths(currentDate, 1)
          : addMonths(currentDate, 1),
      );
    }
  };

  const handleDateClick = (date: Date, hour?: number) => {
    const newDate = new Date(date);
    if (hour !== undefined) {
      newDate.setHours(hour, 0, 0, 0);
    } else {
      newDate.setHours(9, 0, 0, 0); // Default to 9am for monthly view
    }
    setSelectedDate(newDate);
    setShowForm(true);
  };

  const handleSessionUpdate = async (
    sessionId: string,
    date: Date,
    startHour: number,
    endHour: number,
  ) => {
    try {
      const baseDate = new Date(date);
      baseDate.setHours(0, 0, 0, 0);

      const startTime = new Date(baseDate);
      startTime.setHours(startHour, 0, 0, 0);

      const endTime = new Date(baseDate);
      endTime.setHours(endHour, 0, 0, 0);

      await updateSession.mutateAsync({
        id: sessionId,
        date: baseDate,
        startTime,
        endTime,
      });

      // FIX: Manually trigger toast and invalidation
      toast.success("Jadwal berhasil diperbarui");
      utils.trainerSession.getAll.invalidate();
    } catch (error) {
      // onError in useMutation will handle the toast
      console.error("Error updating session:", error);
    }
  };

  const handleSessionDelete = async (sessionId: string) => {
    try {
      const sessionToDelete = trainerSessions?.find((s) => s.id === sessionId);
      if (!sessionToDelete) return;

      const startTime = new Date(sessionToDelete.startTime);
      const now = new Date();
      const hoursUntilSession =
        (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilSession <= 12 && hoursUntilSession > 0) {
        await updateSession.mutateAsync({
          id: sessionId,
          date: new Date(sessionToDelete.date),
          startTime: new Date(sessionToDelete.startTime),
          endTime: new Date(sessionToDelete.endTime),
          status: "CANCELED",
        });
        // FIX: Manually trigger toast and invalidation
        toast.success("Sesi dibatalkan kurang dari 12 jam, status diubah menjadi CANCELED");
        utils.trainerSession.getAll.invalidate();
      } else if (hoursUntilSession > 12) {
        await deleteSession.mutateAsync({ id: sessionId });
        // The deleteSession mutation handles its own success toast and invalidation
      } else {
        toast.error("Tidak dapat membatalkan jadwal yang sudah lewat");
      }
    } catch (error) {
      console.error("Error handling session deletion:", error);
      toast.error("Gagal memproses permintaan penghapusan");
    }
  };

  const handleSessionCancel = async (sessionId: string) => {
    try {
      const sessionToCancel = trainerSessions?.find((s) => s.id === sessionId);
      if (!sessionToCancel) return;

      const startTime = new Date(sessionToCancel.startTime);
      const now = new Date();
      const hoursUntilSession =
        (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilSession <= 12 && hoursUntilSession > 0) {
        await updateSession.mutateAsync({
          id: sessionId,
          date: new Date(sessionToCancel.date),
          startTime: new Date(sessionToCancel.startTime),
          endTime: new Date(sessionToCancel.endTime),
          status: "CANCELED",
        });
        // FIX: Manually trigger toast and invalidation
        toast.success("Jadwal telah ditandai sebagai dibatalkan");
        utils.trainerSession.getAll.invalidate();
      } else {
        toast.error(
          "Hanya dapat membatalkan jadwal dalam 12 jam sebelum sesi dimulai",
        );
      }
    } catch (error) {
      console.error("Error canceling session:", error);
      // onError in useMutation will handle the toast
    }
  };

  // Function to update session statuses in the background
  const updateSessionStatuses = async () => {
    if (!trainerSessions) return;

    const now = new Date();
    const sessionsToUpdate = trainerSessions.filter((session) => {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);
      const isPast = now > endTime;
      const isOngoing = now >= startTime && now <= endTime;

      if (session.status === "NOT_YET" && (isPast || isOngoing)) {
        return true;
      }
      if (session.status === "ONGOING" && isPast) {
        return true;
      }
      return false;
    });

    if (sessionsToUpdate.length === 0) {
      return;
    }

    await Promise.all(
      sessionsToUpdate.map((session) => {
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        const isOngoing = now >= startTime && now <= endTime;
        const newStatus = isOngoing ? "ONGOING" : "ENDED";

        return updateSession.mutateAsync({
          id: session.id,
          date: new Date(session.date),
          startTime: startTime,
          endTime: endTime,
          status: newStatus,
        });
      }),
    );

    // FIX: Invalidate query only once after all updates are done.
    // No toast for background updates.
    utils.trainerSession.getAll.invalidate();
  };

  // Use a ref to ensure the status update only runs once per data load
  const statusUpdateRan = useRef(false);
  useEffect(() => {
    if (trainerSessions && !isLoading && !statusUpdateRan.current) {
      updateSessionStatuses();
      statusUpdateRan.current = true;
    }
    // Reset the flag when the query is fetching again
    if (isLoading) {
      statusUpdateRan.current = false;
    }
  }, [trainerSessions, isLoading]);

  return (
    <ProtectedRoute requiredPermissions={["menu:schedule-pt"]}>
      <div className="relative p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Jadwal Latihan</h1>
          <p className="text-muted-foreground">
            Atur jadwal latihan Anda dengan personal trainer pilihan untuk hasil
            yang maksimal
          </p>
        </div>

        <Calendar
          currentDate={currentDate}
          viewMode={viewMode}
          sessionsByDateTime={sessionsByDateTime}
          sessionsByDate={sessionsByDate}
          onDateClick={handleDateClick}
          onNavigate={handleNavigate}
          onViewModeChange={setViewMode}
          onToday={() => setCurrentDate(new Date())}
          onSessionUpdate={handleSessionUpdate}
          onSessionDelete={handleSessionDelete}
          onSessionCancel={handleSessionCancel}
        />

        <div
          className={`fixed right-0 top-0 z-50 h-full w-96 transform border-l border-border bg-background shadow-lg transition-transform duration-300 ease-in-out ${
            showForm ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="h-full overflow-y-auto p-6">
            <AppointmentForm
              selectedDate={selectedDate}
              onClose={() => setShowForm(false)}
            />
          </div>
        </div>

        {showForm && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          ></div>
        )}
      </div>
    </ProtectedRoute>
  );
}
