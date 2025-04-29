"use client";

import React, { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay, isSameMonth, isBefore, addHours, subMonths, addMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SessionDetailModal from './session-detail-modal';
import { TrainerSession } from '@prisma/client';

interface SessionWithTrainer extends TrainerSession {
  trainer?: {
    user?: {
      name: string;
    };
  };
}

interface CalendarProps {
  sessionsByDateTime: Record<string, SessionWithTrainer[]>;
}

export default function Calendar({ sessionsByDateTime }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionWithTrainer | null>(null);

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  const hours = Array.from({ length: 12 }, (_, i) => i + 7);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleSessionClick = (session: SessionWithTrainer) => {
    setSelectedSession(session);
  };

  const handleCloseModal = () => {
    setSelectedSession(null);
  };

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronLeft className="h-5 w-5 text-gray-800 dark:text-gray-200" />
        </Button>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          {format(currentDate, 'MMMM yyyy', { locale: id })}
        </h2>
        <Button variant="ghost" size="icon" onClick={handleNextMonth} className="hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronRight className="h-5 w-5 text-gray-800 dark:text-gray-200" />
        </Button>
      </div>

      <div className="grid grid-cols-8 gap-1 mb-2">
        <div className="col-span-1"></div>
        {days.map((day) => (
          <div
            key={`day-header-${day.toISOString()}`}
            className={`text-center p-3 rounded-lg ${
              isSameMonth(day, currentDate) 
                ? isSameDay(day, new Date()) 
                  ? 'bg-[#C9D953] text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                : 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500'
            }`}
          >
            <div className="font-medium">{format(day, 'EEE', { locale: id })}</div>
            <div className="text-lg font-bold">{format(day, 'd')}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-8 gap-1">
        {hours.map((hour) => (
          <React.Fragment key={`hour-${hour}`}>
            <div className="text-right p-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
              {format(addHours(new Date().setHours(0, 0, 0, 0), hour), 'HH:mm')}
            </div>
            {days.map((day) => {
              const dateTimeKey = format(day, 'yyyy-MM-dd') + 'T' + format(addHours(new Date().setHours(0, 0, 0, 0), hour), 'HH:mm');
              const sessions = sessionsByDateTime[dateTimeKey] || [];
              const isPast = isBefore(day, new Date()) && hour < new Date().getHours();

              return (
                <div
                  key={`cell-${day.toISOString()}-${hour}`}
                  className={`p-2 min-h-[80px] border border-gray-200 dark:border-gray-700 rounded-lg ${
                    isPast ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-gray-800'
                  }`}
                >
                  {sessions.map((session) => (
                    <div
                      key={`session-${session.id}`}
                      className="bg-[#C9D953] text-black p-2 rounded-lg mb-2 cursor-pointer hover:bg-[#d4e45e] transition-colors"
                      onClick={() => handleSessionClick(session)}
                    >
                      <div className="text-sm font-semibold">
                        {session.trainer?.user?.name || 'Personal Trainer'}
                      </div>
                      <div className="text-xs">
                        {format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <SessionDetailModal
        session={selectedSession}
        onClose={handleCloseModal}
      />
    </div>
  );
} 