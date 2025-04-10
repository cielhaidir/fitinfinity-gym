"use client";

import React, { useState } from 'react';
import { api } from "@/trpc/react";
import { format, addWeeks, subWeeks } from 'date-fns';
import { useSession } from "next-auth/react";
import MemberCalendar from './components/calendar';
import { TrainerSession } from '@prisma/client';

export default function MemberSchedulePage() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { data: trainerSessions, isLoading } = api.trainerSession.getAll.useQuery(undefined, {
    enabled: !!session?.user,
  });

  // Group sessions by date and time
  const sessionsByDateTime: Record<string, TrainerSession[]> = {};
  
  trainerSessions?.forEach((session: TrainerSession) => {
    const dateStr = format(new Date(session.date), 'yyyy-MM-dd');
    const timeStr = format(new Date(session.startTime), 'HH:mm');
    const key = `${dateStr}-${timeStr}`;
    if (!sessionsByDateTime[key]) {
      sessionsByDateTime[key] = [];
    }
    
    sessionsByDateTime[key].push(session);
  });

  const handleNavigate = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
  };

  return (
    <div className="p-6 relative">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black dark:text-white">Jadwal Latihan Anda</h1>
        <p className="text-gray-600 dark:text-gray-400">Lihat jadwal latihan Anda dengan personal trainer</p>
      </div>

      <MemberCalendar
        currentDate={currentDate}
        sessionsByDateTime={sessionsByDateTime}
        onNavigate={handleNavigate}
        onToday={() => setCurrentDate(new Date())}
      />
    </div>
  );
} 