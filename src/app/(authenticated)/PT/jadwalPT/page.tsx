"use client";

import React, { useState } from 'react';
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
    
    sessionsByDateTime[key].push({
      ...session,
      key: `session-${session.id}` // Add a unique key to each session
    });
    sessionsByDate[dateStr].push({
      ...session,
      key: `session-${session.id}` // Add a unique key to each session
    });
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

  const handleSessionDelete = (sessionId: string) => {
    setSessions(prevSessions => 
      prevSessions.filter(session => session.id !== sessionId)
    );
    
    utils.trainerSession.getAll.invalidate();
  };

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