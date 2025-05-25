"use client";

import React, { useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, 
         startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { SessionDetailModal } from './session-detail-modal';
import { DndContext, DragEndEvent, MouseSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import DraggableSession from './draggable-session';
import { toast } from 'sonner';
import { api } from "@/trpc/react";


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
  viewMode: 'monthly' | 'weekly';
  sessionsByDateTime: Record<string, any[]>;
  sessionsByDate: Record<string, any[]>;
  onDateClick: (date: Date, hour?: number) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onViewModeChange: (mode: 'monthly' | 'weekly') => void;
  onToday: () => void;
  onSessionUpdate: (sessionId: string, date: Date, startHour: number, endHour: number) => void;
  onSessionDelete?: (sessionId: string) => void;
  onSessionCancel?: (sessionId: string) => void;
}

// Komponen DroppableCell yang diperbarui
function DroppableCell({ 
  id, 
  children, 
  className,
  onClick,
  isFirstHourOfSession = false,
}: { 
  id: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isFirstHourOfSession?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <td 
      ref={setNodeRef}
      className={`
        ${className}
        ${isOver ? 'bg-[#2a2a2a]' : ''}
        transition-colors duration-200
        relative
        ${isFirstHourOfSession ? 'session-start' : ''}
      `}
      onClick={onClick}
    >
      {children}
    </td>
  );
}

export default function Calendar({
  currentDate,
  viewMode,
  sessionsByDateTime,
  sessionsByDate,
  onDateClick,
  onNavigate,
  onViewModeChange,
  onToday,
  onSessionUpdate,
  onSessionDelete,
  onSessionCancel,
}: CalendarProps) {
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  const CELL_HEIGHT = 64;
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });
  const sensors = useSensors(mouseSensor);

  const utils = api.useUtils();
  const deleteSession = api.trainerSession.delete.useMutation({
    onSuccess: () => {
      toast.success("Jadwal berhasil dihapus");
      utils.trainerSession.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Gagal menghapus jadwal");
    },
  });

  const handleSessionClick = (e: React.MouseEvent, session: any) => {
    e.stopPropagation();
    setSelectedSession(session);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    try {
      // Extract date and hour from the droppable ID
      const dropId = over.id.toString();
      console.log('Drop ID:', dropId);

      // Expecting format: YYYY-MM-DD-HH
      const match = dropId.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{1,2})$/);
      
      if (!match) {
        console.error('Invalid drop ID format:', dropId);
        toast.error('Format ID tidak valid');
        return;
      }

      const [_, year, month, day, hour] = match;
      console.log('Matched components:', { year, month, day, hour });

      // Find the session
      const session = Object.values(sessionsByDateTime)
        .flat()
        .find(s => s.id === active.id);

      if (!session) {
        console.error('Session not found');
        return;
      }

      // Create date object
      const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        0, 0, 0
      );

      const hourNum = Number(hour);

      // Validate date and hour
      if (isNaN(date.getTime()) || isNaN(hourNum)) {
        console.error('Invalid date or hour:', { date, hourNum });
        toast.error('Format tanggal atau jam tidak valid');
        return;
      }

      console.log('Created date:', date.toISOString());

      // Get session duration
      const originalStartTime = new Date(session.startTime);
      const originalEndTime = new Date(session.endTime);
      const duration = originalEndTime.getHours() - originalStartTime.getHours();
      const newEndHour = hourNum + duration;

      // Check if actually moving
      const currentDate = new Date(session.startTime);
      if (
        currentDate.getFullYear() === date.getFullYear() &&
        currentDate.getMonth() === date.getMonth() &&
        currentDate.getDate() === date.getDate() &&
        currentDate.getHours() === hourNum
      ) {
        return;
      }

      // Update session
      onSessionUpdate(session.id, date, hourNum, newEndHour);

    } catch (error) {
      console.error('Error in handleDragEnd:', error);
      toast.error('Gagal memperbarui jadwal');
    }
  };

  const handleResize = (sessionId: string, startHour: number, newEndHour: number) => {
    const session = Object.values(sessionsByDateTime)
      .flat()
      .find(s => s.id === sessionId);

    if (!session) return;

    const date = new Date(session.date);
    onSessionUpdate(sessionId, date, startHour, newEndHour);
  };

  // Calculate ranges
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const monthDays = eachDayOfInterval({ start: startDate, end: endDate });

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession.mutateAsync({ id: sessionId });
      setSelectedSession(null); // Tutup modal setelah berhasil menghapus
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div>
        <div className="flex justify-between mb-4">
          <div className="flex space-x-2">
            <Button 
              onClick={() => onViewModeChange('monthly')} 
              variant={viewMode === 'monthly' ? 'default' : 'outline'}
              className={viewMode === 'monthly' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
            >
              Monthly
            </Button>
            <Button 
              onClick={() => onViewModeChange('weekly')} 
              variant={viewMode === 'weekly' ? 'default' : 'outline'}
              className={viewMode === 'weekly' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
            >
              Weekly
            </Button>
          </div>
          
          <div className="bg-muted text-foreground text-sm px-3 py-1 rounded-full">
            {viewMode === 'weekly' 
              ? `${format(weekStart, 'dd MMMM')} - ${format(weekEnd, 'dd MMMM yyyy')}`
              : format(currentDate, 'MMMM yyyy')
            }
          </div>
        </div>

        <div className="bg-background rounded-lg overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-border">
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
            
            <Button 
              onClick={() => onDateClick(new Date())}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs"
            >
              <Plus className="mr-1 h-3 w-3" /> Jadwalkan Sesi
            </Button>
          </div>

          {viewMode === 'weekly' && (
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
                        const key = `${dateStr}-${timeStr}`;
                        const sessions = sessionsByDateTime[key] || [];
                        
                        return (
                          <DroppableCell
                            key={`${dateStr}-${hour}`}
                            id={`${dateStr}-${hour}`}
                            className={`
                              border-r border-border p-1 
                              h-[64px] align-top 
                              cursor-pointer hover:bg-muted
                              ${isToday(day) ? 'bg-muted/50' : ''}
                            `}
                            onClick={() => onDateClick(day, hour)}
                          >
                            {sessions.map((session) => (
                              <DraggableSession
                                key={session._key || `session-${session.id}`}
                                session={session}
                                onClick={(e) => handleSessionClick(e, session)}
                                onResize={handleResize}
                                cellHeight={CELL_HEIGHT}
                              />
                            ))}
                          </DroppableCell>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {viewMode === 'monthly' && (
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                  <div key={day} className="p-2 text-center font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
                
                {monthDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const sessions = sessionsByDate[dateStr] || [];
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  
                  return (
                    <div
                      key={`month-${dateStr}`}
                      className={`
                        min-h-[100px] p-2 border border-border rounded-md
                        ${!isCurrentMonth ? 'opacity-40' : ''}
                        ${isToday(day) ? 'border-primary' : ''}
                        cursor-pointer hover:bg-muted
                      `}
                      onClick={() => onDateClick(day)}
                    >
                      <div className={`text-right ${isToday(day) ? 'text-primary font-bold' : ''}`}>
                        {format(day, 'd')}
                      </div>
                      
                      <div className="mt-1 space-y-1 max-h-[80px] overflow-y-auto">
                        {sessions.slice(0, 3).map((session) => (
                          <div 
                            key={session._key || `session-${session.id}`}
                            className={`${
                              session.exerciseResult
                                ? 'bg-blue-500 hover:bg-blue-600'
                                : session.status === 'ENDED' 
                                ? 'bg-muted hover:bg-muted/80'
                                : session.status === 'ONGOING'
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : session.status === 'CANCELED'
                                ? 'bg-destructive hover:bg-destructive/80'
                                : 'bg-[#C9D953] hover:bg-[#b8c748]'
                            } text-foreground text-xs rounded cursor-pointer transition-colors`}
                            onClick={(e) => handleSessionClick(e, session)}
                          >
                            <div className="truncate">{format(new Date(session.startTime), 'HH:mm')}</div>
                            <div className="truncate">{session.member.user.name}</div>
                            {session.exerciseResult && (
                              <div className="text-xs font-bold text-blue-900 mt-1">
                                Hasil Terupload
                              </div>
                            )}
                            {session.status === 'CANCELED' && (
                              <div className="text-xs font-bold text-destructive-foreground mt-1">
                                Dibatalkan
                              </div>
                            )}
                            {session.status === 'ONGOING' && (
                              <div className="text-xs font-bold text-yellow-900 mt-1">
                                Sedang Berlangsung
                              </div>
                            )}
                            {session.status === 'ENDED' && !session.exerciseResult && (
                              <div className="text-xs font-bold text-muted-foreground mt-1">
                                Selesai
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {sessions.length > 3 && (
                          <div key={`more-${dateStr}`} className="text-xs text-muted-foreground text-center">
                            +{sessions.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {selectedSession && (
          <SessionDetailModal
            session={selectedSession}
            isOpen={!!selectedSession}
            onClose={() => setSelectedSession(null)}
            onDelete={onSessionDelete || (() => {})}
            onCancel={onSessionCancel}
          />
        )}
      </div>
    </DndContext>
  );
} 