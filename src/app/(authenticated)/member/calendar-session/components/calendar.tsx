"use client";

import React, { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SessionDetailModal from './session-detail-modal';
import { TrainerSession } from '@prisma/client';

interface CalendarProps {
  currentDate: Date;
  sessionsByDateTime: Record<string, TrainerSession[]>;
  onNavigate: (direction: 'prev' | 'next') => void;
  onToday: () => void;
}

export default function MemberCalendar({ currentDate, sessionsByDateTime, onNavigate, onToday }: CalendarProps) {
  const [selectedSession, setSelectedSession] = useState<TrainerSession | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const timeSlots = Array.from({ length: 14 }, (_, i) => {
    const hour = i + 7; // Start from 7 AM
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const handleSessionClick = (session: TrainerSession) => {
    setSelectedSession(session);
  };

  return (
    <div className="rounded-lg overflow-hidden">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-4 bg-gray-50 dark:bg-[#232323] p-4 rounded-lg">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onNavigate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => onNavigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={onToday}>Today</Button>
        </div>
        <h3 className="text-lg font-semibold text-black dark:text-white">
          {format(currentDate, 'MMMM yyyy', { locale: id })}
        </h3>
      </div>

      {/* Calendar Grid */}
      <div className="bg-gray-50 dark:bg-[#232323] rounded-lg overflow-hidden">
        {/* Days header */}
        <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
          <div className="p-2 text-center text-sm font-medium text-black dark:text-gray-400">
            Waktu
          </div>
          {days.map((day, index) => (
            <div
              key={index}
              className={`p-2 text-center text-sm font-medium 
                ${isSameDay(day, new Date()) 
                  ? 'text-[#C9D953] dark:text-[#C9D953]' 
                  : 'text-black dark:text-gray-400'}`}
            >
              <div>{format(day, 'EEEE', { locale: id })}</div>
              <div>{format(day, 'd MMM')}</div>
            </div>
          ))}
        </div>

        {/* Time slots */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {timeSlots.map((time) => (
            <div key={time} className="grid grid-cols-8">
              <div className="p-2 text-center text-sm text-black dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                {time}
              </div>
              {days.map((day, dayIndex) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const key = `${dateStr}-${time}`;
                const sessions = sessionsByDateTime[key] || [];

                return (
                  <div
                    key={dayIndex}
                    className={`p-2 border-r border-gray-200 dark:border-gray-700 min-h-[60px] relative
                      ${isSameDay(day, new Date()) ? 'bg-gray-100 dark:bg-gray-800/50' : ''}`}
                  >
                    {sessions.map((session, sessionIndex) => (
                      <div
                        key={sessionIndex}
                        onClick={() => handleSessionClick(session)}
                        className="cursor-pointer bg-[#C9D953] text-black p-1 rounded text-sm mb-1 hover:bg-[#d4e45e]"
                      >
                        {session.trainerId || 'Personal Trainer'}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetailModal
          session={{
            trainerId: selectedSession.trainerId,
            startTime: selectedSession.startTime,
            endTime: selectedSession.endTime,
            description: selectedSession.description || undefined
          }}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
} 