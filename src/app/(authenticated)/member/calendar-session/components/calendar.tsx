"use client";

import React, { useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SessionDetailModal from './session-detail-modal';

// Generate time slots from 6am to 9pm
const timeSlots = Array.from({ length: 16 }, (_, i) => {
  const hour = i + 6; // Start from 6am
  return {
    label: `${hour < 12 ? hour : hour === 12 ? 12 : hour - 12}${hour < 12 ? 'am' : 'pm'}`,
    hour
  };
});

interface CalendarProps {
  currentDate: Date;
  sessionsByDateTime: Record<string, any[]>;
  onNavigate: (direction: 'prev' | 'next') => void;
  onToday: () => void;
}

export default function MemberCalendar({
  currentDate,
  sessionsByDateTime,
  onNavigate,
  onToday,
}: CalendarProps) {
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const CELL_HEIGHT = 64;

  // Calculate ranges
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const handleSessionClick = (e: React.MouseEvent, session: any) => {
    e.stopPropagation();
    setSelectedSession(session);
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <div className="bg-[#2a2a2a] text-white text-sm px-3 py-1 rounded-full">
          {`${format(weekStart, 'dd MMMM')} - ${format(weekEnd, 'dd MMMM yyyy')}`}
        </div>
      </div>

      <div className="bg-[#232323] rounded-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-[#2a2a2a]">
          <div className="flex space-x-2">
            <Button 
              onClick={() => onNavigate('prev')} 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              onClick={() => onNavigate('next')} 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button onClick={onToday} variant="secondary" className="h-8 text-xs">today</Button>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-20 border-r border-[#2a2a2a] p-2"></th>
                {days.map((day) => (
                  <th 
                    key={day.toString()} 
                    className={`border-r border-[#2a2a2a] p-2 text-center ${
                      isToday(day) ? 'bg-[#2a2a2a]' : ''
                    }`}
                  >
                    <div className="text-gray-400">{format(day, 'EEE', { locale: id })}</div>
                    <div className={`text-lg ${isToday(day) ? 'text-[#C9D953] font-bold' : 'text-white'}`}>
                      {format(day, 'd/M')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(({ label, hour }) => (
                <tr key={label} className="border-t border-[#2a2a2a]">
                  <td className="border-r border-[#2a2a2a] p-2 text-right font-medium text-gray-400 w-20">
                    {label}
                  </td>
                  {days.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                    const key = `${dateStr}-${timeStr}`;
                    const sessions = sessionsByDateTime[key] || [];
                    
                    return (
                      <td
                        key={`${dateStr}-${hour}`}
                        className={`
                          border-r border-[#2a2a2a] p-1 
                          relative
                          ${isToday(day) ? 'bg-[#2a2a2a]/50' : ''}
                        `}
                        style={{ height: `${CELL_HEIGHT}px` }}
                      >
                        {sessions.map((session) => (
                          <div
                            key={session.id}
                            className="bg-[#C9D953] text-black text-xs rounded-md p-2 cursor-pointer hover:bg-[#b8c748]"
                            onClick={(e) => handleSessionClick(e, session)}
                          >
                            <div className="font-bold truncate">
                              {session.trainer?.user?.name || 'Personal Trainer'}
                            </div>
                            <div className="text-xs opacity-75">
                              {format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}
                            </div>
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
      </div>

      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
} 