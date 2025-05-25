"use client";

import React, { useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, 
         startOfMonth, endOfMonth, isSameMonth, addWeeks, subWeeks } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { SessionDetailModal } from './session-detail-modal';
import { TrainerSession } from '@prisma/client';

type SessionStatus = 'ENDED' | 'NOT_YET' | 'CANCELED' | 'ONGOING';

interface SessionWithTrainer {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  description: string | null;
  exerciseResult: string | null;
  status: SessionStatus;
  _uniqueKey: string;
  trainer: {
    user: {
      name: string;
      email: string;
    };
  };
}

interface CalendarProps {
  sessionsByDateTime: Record<string, SessionWithTrainer[]>;
}

// Generate time slots from 6am to 9pm
const timeSlots = Array.from({ length: 16 }, (_, i) => {
  const hour = i + 6; // Start from 6am
  return {
    label: `${hour < 12 ? hour : hour === 12 ? 12 : hour - 12}${hour < 12 ? 'am' : 'pm'}`,
    hour
  };
});

export default function Calendar({ sessionsByDateTime }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<SessionWithTrainer | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const handlePrevWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleSessionClick = (session: SessionWithTrainer) => {
    setSelectedSession(session);
  };

  const handleCloseModal = () => {
    setSelectedSession(null);
  };

  const getStatusColor = (status: SessionWithTrainer['status'], exerciseResult: string | null) => {
    if (exerciseResult) {
      return 'bg-blue-500 hover:bg-blue-600';
    }
    
    switch (status) {
      case 'ENDED':
        return 'bg-gray-500 hover:bg-gray-600';
      case 'CANCELED':
        return 'bg-destructive hover:bg-destructive/80';
      case 'ONGOING':
        return 'bg-yellow-500 hover:bg-yellow-600';
      default:
        return 'bg-[#C9D953] hover:bg-[#b8c748]';
    }
  };

  const getStatusText = (status: SessionWithTrainer['status'], exerciseResult: string | null) => {
    if (exerciseResult) {
      return 'Hasil Terupload';
    }
    
    switch (status) {
      case 'ENDED':
        return 'Selesai';
      case 'CANCELED':
        return 'Dibatalkan';
      case 'ONGOING':
        return 'Sedang Berlangsung';
      default:
        return '';
    }
  };

  return (
    <div className="bg-background rounded-lg overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-border">
        <div className="flex space-x-2">
          <Button 
            onClick={handlePrevWeek} 
            variant="outline" 
            size="icon" 
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            onClick={handleNextWeek} 
            variant="outline" 
            size="icon" 
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={handleToday} variant="secondary" className="h-8 text-xs">today</Button>
        </div>
        
        <div className="bg-muted text-foreground text-sm px-3 py-1 rounded-full">
          {format(weekStart, 'dd MMMM', { locale: id })} - {format(weekEnd, 'dd MMMM yyyy', { locale: id })}
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-20 border-r border-border p-2"></th>
              {days.map((day) => (
                <th 
                  key={day.toString()} 
                  className={`border-r border-border p-2 text-center ${
                    isToday(day) ? 'bg-muted' : ''
                  }`}
                >
                  <div className="text-muted-foreground">{format(day, 'EEE', { locale: id })}</div>
                  <div className={`text-lg ${isToday(day) ? 'text-primary font-bold' : 'text-foreground'}`}>
                    {format(day, 'd/M')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(({ label, hour }) => (
              <tr key={`time-${hour}`} className="border-t border-border">
                <td className="border-r border-border p-2 text-right font-medium text-muted-foreground w-20">
                  {label}
                </td>
                {days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                  const key = `${dateStr}T${timeStr}`;
                  const sessions = sessionsByDateTime[key] || [];
                  
                  return (
                    <td
                      key={`${dateStr}-${hour}`}
                      className={`
                        border-r border-border p-1 
                        h-[64px] align-top 
                        ${isToday(day) ? 'bg-muted/50' : ''}
                      `}
                    >
                      {sessions.map((session) => (
                        <div
                          key={session._uniqueKey}
                          className={`${getStatusColor(session.status, session.exerciseResult)} text-foreground p-1.5 rounded cursor-pointer transition-colors`}
                          onClick={() => handleSessionClick(session)}
                        >
                          <div className="font-medium">
                            {format(new Date(session.startTime), 'HH:mm')}
                          </div>
                          <div className="truncate">
                            {session.trainer?.user?.name || 'Personal Trainer'}
                          </div>
                          {getStatusText(session.status, session.exerciseResult) && (
                            <div className="text-xs font-bold text-foreground mt-1">
                              {getStatusText(session.status, session.exerciseResult)}
                            </div>
                          )}
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SessionDetailModal
        session={selectedSession}
        onClose={handleCloseModal}
      />
    </div>
  );
} 