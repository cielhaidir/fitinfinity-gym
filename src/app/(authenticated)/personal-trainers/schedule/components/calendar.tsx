"use client";

import React, { useState } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  startOfMonth,
  endOfMonth,
  isSameMonth,
} from "date-fns";
import { id } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";
import { SessionDetailModal } from "./session-detail-modal";
import {
  DndContext,
  type DragEndEvent,
  MouseSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import DraggableSession from "./draggable-session";
import { toast } from "sonner";
import { api } from "@/trpc/react";

// Generate time slots from 6am to 9pm
const timeSlots = Array.from({ length: 16 }, (_, i) => {
  const hour = i + 6; // Start from 6am
  return {
    label: `${hour < 12 ? hour : hour === 12 ? 12 : hour - 12}${hour < 12 ? "am" : "pm"}`,
    hour,
  };
});

interface CalendarProps {
  currentDate: Date;
  viewMode: "monthly" | "weekly";
  sessionsByDateTime: Record<string, any[]>;
  sessionsByDate: Record<string, any[]>;
  onDateClick: (date: Date, hour?: number) => void;
  onNavigate: (direction: "prev" | "next") => void;
  onViewModeChange: (mode: "monthly" | "weekly") => void;
  onToday: () => void;
  onSessionUpdate: (
    sessionId: string,
    date: Date,
    startHour: number,
    endHour: number,
  ) => void;
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
      className={` ${className} ${isOver ? "bg-[#2a2a2a]" : ""} relative transition-colors duration-200 ${isFirstHourOfSession ? "session-start" : ""} `}
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
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleDayClick = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const daySessions: any[] = [];
    
    // Collect all sessions for this day
    Object.keys(sessionsByDateTime).forEach(key => {
      if (key.startsWith(dateStr)) {
        const sessions = sessionsByDateTime[key];
        if (sessions) {
          daySessions.push(...sessions);
        }
      }
    });
    
    setSelectedDay(day);
    setSelectedSessions(daySessions);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDay(null);
    setSelectedSessions([]);
  };

  const getStatusColor = (session: any) => {
    if (session.exerciseResult) {
      return "bg-blue-500";
    }
    switch (session.status) {
      case "ENDED":
        return "bg-gray-500";
      case "CANCELED":
        return "bg-red-500";
      case "ONGOING":
        return "bg-yellow-500";
      default:
        return "bg-green-500";
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    try {
      // Extract date and hour from the droppable ID
      const dropId = over.id.toString();
      console.log("Drop ID:", dropId);

      // Expecting format: YYYY-MM-DD-HH
      const match = /^(\d{4})-(\d{2})-(\d{2})-(\d{1,2})$/.exec(dropId);

      if (!match) {
        console.error("Invalid drop ID format:", dropId);
        toast.error("Format ID tidak valid");
        return;
      }

      const [_, year, month, day, hour] = match;
      console.log("Matched components:", { year, month, day, hour });

      // Find the session
      const session = Object.values(sessionsByDateTime)
        .flat()
        .find((s) => s.id === active.id);

      if (!session) {
        console.error("Session not found");
        return;
      }

      // Create date object
      const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        0,
        0,
        0,
      );

      const hourNum = Number(hour);

      // Validate date and hour
      if (isNaN(date.getTime()) || isNaN(hourNum)) {
        console.error("Invalid date or hour:", { date, hourNum });
        toast.error("Format tanggal atau jam tidak valid");
        return;
      }

      console.log("Created date:", date.toISOString());

      // Get session duration
      const originalStartTime = new Date(session.startTime);
      const originalEndTime = new Date(session.endTime);
      const duration =
        originalEndTime.getHours() - originalStartTime.getHours();
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
      console.error("Error in handleDragEnd:", error);
      toast.error("Gagal memperbarui jadwal");
    }
  };

  const handleResize = (
    sessionId: string,
    startHour: number,
    newEndHour: number,
  ) => {
    const session = Object.values(sessionsByDateTime)
      .flat()
      .find((s) => s.id === sessionId);

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
        <div className="mb-4 flex justify-between">
          <div className="flex space-x-2">
            <Button
              onClick={() => onViewModeChange("monthly")}
              variant={viewMode === "monthly" ? "default" : "outline"}
              className={
                viewMode === "monthly"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : ""
              }
            >
              Monthly
            </Button>
            <Button
              onClick={() => onViewModeChange("weekly")}
              variant={viewMode === "weekly" ? "default" : "outline"}
              className={
                viewMode === "weekly"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : ""
              }
            >
              Weekly
            </Button>
          </div>

          <div className="rounded-full bg-muted px-3 py-1 text-sm text-foreground">
            {viewMode === "weekly"
              ? `${format(weekStart, "dd MMMM")} - ${format(weekEnd, "dd MMMM yyyy")}`
              : format(currentDate, "MMMM yyyy")}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-background">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex space-x-2">
              <Button
                onClick={() => onNavigate("prev")}
                variant="outline"
                size="icon"
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => onNavigate("next")}
                variant="outline"
                size="icon"
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={onToday}
                variant="secondary"
                className="h-8 text-xs"
              >
                today
              </Button>
            </div>

            <Button
              onClick={() => onDateClick(new Date())}
              className="h-8 bg-primary text-xs text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-1 h-3 w-3" /> Jadwalkan Sesi
            </Button>
          </div>

          {viewMode === "weekly" && (
            <>
              {/* Mobile view - Grid like dashboard PT */}
              <div className="sm:hidden">
                <div className="rounded-lg bg-[#232323] p-4">
                  <div className="mb-4 text-center text-lg font-semibold">
                    {format(weekStart, "dd MMMM", { locale: id })} -{" "}
                    {format(weekEnd, "dd MMMM yyyy", { locale: id })}
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {days.map((day) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const daySessions: any[] = [];
                      
                      // Collect all sessions for this day
                      Object.keys(sessionsByDateTime).forEach(key => {
                        if (key.startsWith(dateStr)) {
                          const sessions = sessionsByDateTime[key];
                          if (sessions) {
                            daySessions.push(...sessions);
                          }
                        }
                      });
                      
                      return (
                        <button
                          key={day.toString()}
                          onClick={() => handleDayClick(day)}
                          className={`aspect-square w-full rounded-md border border-[#2a2a2a] p-1 flex flex-col items-center justify-between focus:outline-none transition-colors ${isToday(day) ? "border-[#C9D953] bg-[#2a2a2a]" : ""}`}
                        >
                          <div className="flex flex-col items-center">
                            <div className="text-xs">
                              {format(day, "EEE", { locale: id })}
                            </div>
                            <div className="text-base">{format(day, "d")}</div>
                          </div>
                          <div className="flex flex-wrap justify-center gap-1 mt-1 min-h-[12px]">
                            {daySessions.length > 0 &&
                              daySessions.map((session, idx) => (
                                <span
                                  key={session.id || idx}
                                  className={`w-2 h-2 rounded-full ${getStatusColor(session)}`}
                                />
                              ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Desktop view - Table */}
              <div className="hidden sm:block overflow-x-auto scrollbar-thin scrollbar-thumb-[#C9D953] scrollbar-track-[#232323] relative">
                <table className="min-w-[700px] w-full border-collapse text-xs sm:text-sm">
                <thead>
                  <tr>
                      <th className="w-16 sm:w-20 border-r border-border p-1 sm:p-2"></th>
                    {days.map((day) => (
                      <th
                        key={day.toString()}
                          className={`border-r border-border p-1 sm:p-2 text-center ${isToday(day) ? "bg-muted" : ""}`}
                      >
                        <div className="text-muted-foreground">
                          {format(day, "EEE", { locale: id })}
                        </div>
                        <div
                            className={`text-base sm:text-lg ${isToday(day) ? "font-bold text-primary" : "text-foreground"}`}
                        >
                          {format(day, "d/M")}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map(({ label, hour }) => (
                    <tr key={`time-${hour}`} className="border-t border-border">
                        <td className="w-16 sm:w-20 border-r border-border p-1 sm:p-2 text-right font-medium text-muted-foreground">
                        {label}
                      </td>
                      {days.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const timeStr = `${hour.toString().padStart(2, "0")}:00`;
                        const key = `${dateStr}-${timeStr}`;
                        const sessions = sessionsByDateTime[key] || [];
                        return (
                          <DroppableCell
                            key={`${dateStr}-${hour}`}
                            id={`${dateStr}-${hour}`}
                              className={`h-[48px] sm:h-[64px] cursor-pointer border-r border-border p-0.5 sm:p-1 align-top hover:bg-muted ${isToday(day) ? "bg-muted/50" : ""} `}
                            onClick={() => onDateClick(day, hour)}
                          >
                              <div className="flex flex-wrap gap-1 justify-center items-center h-full">
                            {sessions.map((session) => (
                              <DraggableSession
                                key={session._key || `session-${session.id}`}
                                session={session}
                                onClick={(e) => handleSessionClick(e, session)}
                                onResize={handleResize}
                                cellHeight={CELL_HEIGHT}
                              />
                            ))}
                              </div>
                          </DroppableCell>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

              {/* Mobile Modal */}
              {isModalOpen && (
                <div className="sm:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="bg-[#232323] text-white rounded-lg p-4 max-w-xs w-full border border-[#2a2a2a] shadow-lg relative" style={{ boxShadow: "0 0 30px rgba(201, 217, 83, 0.3), 0 0 60px rgba(201, 217, 83, 0.1)" }}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-bold text-lg">
                        {selectedDay && format(selectedDay, "EEEE, dd MMM yyyy", { locale: id })}
                      </div>
                      <button onClick={handleCloseModal} className="text-gray-400 hover:text-[#C9D953] text-xl font-bold">✕</button>
                    </div>
                    {selectedSessions.length === 0 ? (
                      <div className="text-gray-400 text-sm mb-4">Tidak ada jadwal pada hari ini.</div>
                    ) : (
                      <ul className="space-y-2 mb-4">
                        {selectedSessions.map((session, idx) => (
                          <li 
                            key={session.id || idx} 
                            className="border-b border-[#2a2a2a] pb-2 last:border-b-0 last:pb-0 cursor-pointer hover:bg-[#2a2a2a] p-2 rounded transition-colors"
                            onClick={() => {
                              setSelectedSession(session);
                              handleCloseModal();
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-[#C9D953]">
                                {session.type === "group" ? (session.groupName ?? "Group") : session.member?.user?.name || "-"}
                              </div>
                              <div className="text-xs text-gray-300">
                                {format(new Date(session.startTime), "HH:mm")} - {format(new Date(session.endTime), "HH:mm")}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {session.status === "ONGOING" ? "Sedang Berlangsung" : 
                               session.status === "ENDED" ? "Selesai" :
                               session.status === "CANCELED" ? "Dibatalkan" : "Belum Dimulai"}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button
                      onClick={() => {
                        handleCloseModal();
                        onDateClick(selectedDay!);
                      }}
                      className="w-full bg-[#C9D953] text-black hover:bg-[#b8c748]"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Tambah Jadwal
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
          {viewMode === "monthly" && (
            <div className="p-2 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-1">
                {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(
                  (day) => (
                    <div
                      key={day}
                      className="p-1 sm:p-2 text-center font-medium text-muted-foreground"
                    >
                      {day}
                    </div>
                  ),
                )}
                {monthDays.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const sessions = sessionsByDate[dateStr] || [];
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  return (
                    <div
                      key={`month-${dateStr}`}
                      className={`min-h-[64px] sm:min-h-[100px] rounded-md border border-border p-1 sm:p-2 ${!isCurrentMonth ? "opacity-40" : ""} ${isToday(day) ? "border-primary" : ""} cursor-pointer hover:bg-muted`}
                      onClick={() => onDateClick(day)}
                    >
                      <div className={`text-right ${isToday(day) ? "font-bold text-primary" : ""}`}>{format(day, "d")}</div>
                      <div className="mt-1 max-h-[60px] sm:max-h-[80px] space-y-1 overflow-y-auto">
                        {sessions.slice(0, 3).map((session) => (
                          <div
                            key={session._key || `session-${session.id}`}
                            className={`$ {
                              session.exerciseResult
                                ? "bg-blue-500 hover:bg-blue-600"
                                : session.status === "ENDED"
                                  ? "bg-muted hover:bg-muted/80"
                                  : session.status === "ONGOING"
                                    ? "bg-yellow-500 hover:bg-yellow-600"
                                    : session.status === "CANCELED"
                                      ? "bg-destructive hover:bg-destructive/80"
                                      : "bg-[#C9D953] hover:bg-[#b8c748]"
                            } cursor-pointer rounded text-[10px] sm:text-xs text-foreground transition-colors`}
                            onClick={(e) => handleSessionClick(e, session)}
                          >
                            <div className="truncate">
                              {format(new Date(session.startTime), "HH:mm")}
                            </div>
                            <div className="truncate">
                              {session.type === "group" ? (session.groupName ?? "Group") : session.member.user.name}
                            </div>
                            {session.exerciseResult && (
                              <div className="mt-1 text-[10px] sm:text-xs font-bold text-blue-900">
                                Hasil Terupload
                              </div>
                            )}
                            {session.status === "CANCELED" && (
                              <div className="mt-1 text-[10px] sm:text-xs font-bold text-destructive-foreground">
                                Dibatalkan
                              </div>
                            )}
                            {session.status === "ONGOING" && (
                              <div className="mt-1 text-[10px] sm:text-xs font-bold text-yellow-900">
                                Sedang Berlangsung
                              </div>
                            )}
                            {session.status === "ENDED" &&
                              !session.exerciseResult && (
                                <div className="mt-1 text-[10px] sm:text-xs font-bold text-muted-foreground">
                                  Selesai
                                </div>
                              )}
                          </div>
                        ))}
                        {sessions.length > 3 && (
                          <div
                            key={`more-${dateStr}`}
                            className="text-center text-[10px] sm:text-xs text-muted-foreground"
                          >
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
