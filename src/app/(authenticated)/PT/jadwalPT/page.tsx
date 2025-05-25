"use client";

import React, { useState, useEffect } from 'react';
import { api } from "@/trpc/react";
import { format, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { useSession } from "next-auth/react";
import Calendar from './components/calendar';
import AppointmentForm from './components/appointment-form';
import { toast } from "sonner";

export default function JadwalPTPage() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('weekly');
  const [sessions, setSessions] = useState<any[]>([]);
  
  const utils = api.useUtils();
  
  const { data: trainerSessions, isLoading } = api.trainerSession.getAll.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const updateSession = api.trainerSession.update.useMutation({
    onSuccess: () => {
      toast.success("Jadwal berhasil diperbarui");
      // Refresh data
      utils.trainerSession.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const deleteSession = api.trainerSession.delete.useMutation({
    onSuccess: () => {
      toast.success("Jadwal berhasil dihapus");
      // Refresh data
      utils.trainerSession.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Group sessions by date and time
  const sessionsByDateTime: Record<string, any[]> = {};
  const sessionsByDate: Record<string, any[]> = {};
  
  trainerSessions?.forEach(session => {
    const dateStr = format(new Date(session.date), 'yyyy-MM-dd');
    const timeStr = format(new Date(session.startTime), 'HH:mm');
    const key = `${dateStr}-${timeStr}`;
    
    if (!sessionsByDateTime[key]) {
      sessionsByDateTime[key] = [];
    }
    if (!sessionsByDate[dateStr]) {
      sessionsByDate[dateStr] = [];
    }
    
    // Create a new session object with a stable key
    const sessionWithKey = {
      ...session,
      _key: `session-${session.id}-${dateStr}-${timeStr}` // More unique key
    };
    
    sessionsByDateTime[key].push(sessionWithKey);
    sessionsByDate[dateStr].push(sessionWithKey);
  });

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'weekly') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
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
    endHour: number
  ) => {
    try {
      console.log('Received update request:', {
        sessionId,
        date: date.toISOString(),
        startHour,
        endHour
      });

      // Create dates in the local timezone
      const baseDate = new Date(date);
      baseDate.setHours(0, 0, 0, 0);

      const startTime = new Date(baseDate);
      startTime.setHours(startHour, 0, 0, 0);
      
      const endTime = new Date(baseDate);
      endTime.setHours(endHour, 0, 0, 0);

      console.log('Prepared dates:', {
        date: baseDate.toISOString(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      });

      const result = await updateSession.mutateAsync({
        id: sessionId,
        date: baseDate,
        startTime,
        endTime,
      });

      console.log('Update result:', result);
      toast.success('Jadwal berhasil diperbarui');
      await utils.trainerSession.getAll.invalidate();
    } catch (error) {
      console.error('Error updating session:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        toast.error(error.message);
      } else {
        toast.error('Gagal mengupdate jadwal');
      }
    }
  };

  const handleSessionDelete = async (sessionId: string) => {
    try {
      // Find the session to be deleted
      const sessionToDelete = trainerSessions?.find(s => s.id === sessionId);
      if (!sessionToDelete) return;

      const startTime = new Date(sessionToDelete.startTime);
      const now = new Date();
      const hoursUntilSession = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // If within 12 hours of the session start time, mark as cancelled
      if (hoursUntilSession <= 12 && hoursUntilSession > 0) {
        // If within 12 hours, mark as cancelled instead of deleting
        await updateSession.mutateAsync({
          id: sessionId,
          date: new Date(sessionToDelete.date),
          startTime: new Date(sessionToDelete.startTime),
          endTime: new Date(sessionToDelete.endTime),
          status: 'CANCELED'
        });
        toast.success("Jadwal telah ditandai sebagai dibatalkan");
      } else if (hoursUntilSession > 12) {
        // If more than 12 hours, delete normally
        await deleteSession.mutateAsync({ id: sessionId });
        toast.success("Jadwal berhasil dihapus");
      } else {
        // If session has already started or is in the past
        toast.error("Tidak dapat membatalkan jadwal yang sudah lewat");
        return;
      }
      
      utils.trainerSession.getAll.invalidate();
    } catch (error) {
      console.error("Error handling session deletion:", error);
      toast.error("Gagal memproses permintaan");
    }
  };

  // New function to handle session cancellation
  const handleSessionCancel = async (sessionId: string) => {
    try {
      const sessionToCancel = trainerSessions?.find(s => s.id === sessionId);
      if (!sessionToCancel) return;

      const startTime = new Date(sessionToCancel.startTime);
      const now = new Date();
      const hoursUntilSession = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilSession <= 12 && hoursUntilSession > 0) {
        await updateSession.mutateAsync({
          id: sessionId,
          date: new Date(sessionToCancel.date),
          startTime: new Date(sessionToCancel.startTime),
          endTime: new Date(sessionToCancel.endTime),
          status: 'CANCELED'
        });
        toast.success("Jadwal telah ditandai sebagai dibatalkan");
        utils.trainerSession.getAll.invalidate();
      } else {
        toast.error("Hanya dapat membatalkan jadwal dalam 12 jam sebelum sesi dimulai");
      }
    } catch (error) {
      console.error("Error canceling session:", error);
      toast.error("Gagal membatalkan jadwal");
    }
  };

  // Function to update session statuses
  const updateSessionStatuses = async () => {
    if (!trainerSessions) return;

    const now = new Date();
    const sessionsToUpdate = trainerSessions.filter(session => {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);
      
      // Check if session is ongoing
      if (session.status === 'NOT_YET' && now >= startTime && now <= endTime) {
        return true;
      }
      
      // Check if session has ended
      if ((session.status === 'NOT_YET' || session.status === 'ONGOING') && now > endTime) {
        return true;
      }
      
      return false;
    });

    for (const session of sessionsToUpdate) {
      try {
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        let newStatus: 'ONGOING' | 'ENDED';

        if (now >= startTime && now <= endTime) {
          newStatus = 'ONGOING';
        } else {
          newStatus = 'ENDED';
        }

        await updateSession.mutateAsync({
          id: session.id,
          date: new Date(session.date),
          startTime: startTime,
          endTime: endTime,
          status: newStatus
        });
      } catch (error) {
        console.error('Error updating session status:', error);
      }
    }

    if (sessionsToUpdate.length > 0) {
      utils.trainerSession.getAll.invalidate();
    }
  };

  // Call updateSessionStatuses when sessions are loaded
  useEffect(() => {
    if (trainerSessions) {
      updateSessionStatuses();
    }
  }, [trainerSessions]);

  return (
    <div className="p-6 relative">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Jadwal Latihan</h1>
        <p className="text-gray-400">Atur jadwal latihan Anda dengan personal trainer pilihan untuk hasil yang maksimal</p>
      </div>

      <div className="bg-[#232323] p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold text-[#C9D953] mb-2">Jadwal Latihan</h2>
        <p className="text-gray-400">Pilih tanggal dan waktu untuk sesi latihan Anda</p>
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

      {/* Slide-in form */}
      <div className={`fixed top-0 right-0 h-full w-96 bg-[#232323] shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
        showForm ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-6 h-full overflow-y-auto">
          <AppointmentForm 
            selectedDate={selectedDate} 
            onClose={() => setShowForm(false)}
          />
        </div>
      </div>
      
      {/* Overlay when form is open */}
      {showForm && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowForm(false)}
        ></div>
      )}
    </div>
  );
}