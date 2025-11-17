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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SessionDetailModal } from "./session-detail-modal";

// Generate time slots from 12am (midnight) to 11pm (24 hours)
const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = i; // Start from 0 (midnight)
  return {
    label: hour === 0 ? "12am" : hour < 12 ? `${hour}am` : hour === 12 ? "12pm" : `${hour - 12}pm`,
    hour,
  };
});

interface CalendarProps {
  currentDate: Date;
  viewMode: "monthly" | "weekly";
  sessionsByDateTime: Record<string, any[]>;
  sessionsByDate: Record<string, any[]>;
  onNavigate: (direction: "prev" | "next") => void;
  onViewModeChange: (mode: "monthly" | "weekly") => void;
  onToday: () => void;
  onRefreshData?: () => void;
  onDateClick?: (date: Date) => void;
  onEditSession?: (session: any) => void;
}

export default function ManagerCalendar({
  currentDate,
  viewMode,
  sessionsByDateTime,
  sessionsByDate,
  onNavigate,
  onViewModeChange,
  onToday,
  onRefreshData,
  onDateClick,
  onEditSession,
}: CalendarProps) {
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  // Calculate ranges
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start from Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start from Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: startDate, end: endDate });

  const handleSessionClick = (e: React.MouseEvent, session: any) => {
    e.stopPropagation();
    setSelectedSession(session);
  };

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row sm:justify-between gap-2">
        <div className="flex space-x-2">
          <Button
            onClick={() => onViewModeChange("monthly")}
            variant={viewMode === "monthly" ? "default" : "outline"}
            className={
              viewMode === "monthly"
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : ""
            }
            size="sm"
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
            size="sm"
          >
            Weekly
          </Button>
        </div>

        <div className="rounded-full bg-muted px-3 py-1 text-xs sm:text-sm text-foreground text-center sm:text-left">
          {viewMode === "weekly"
            ? `${format(weekStart, "dd MMM")} - ${format(weekEnd, "dd MMM yyyy")}`
            : format(currentDate, "MMMM yyyy")}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-background border border-border">
        <div className="flex items-center justify-between border-b border-border p-2 sm:p-4">
          <div className="flex space-x-1 sm:space-x-2">
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
              className="h-8 text-xs px-2 sm:px-3"
            >
              today
            </Button>
          </div>
        </div>

        {viewMode === "weekly" && (
          <div className="overflow-x-auto overflow-y-visible">
            <div className="min-w-max">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="min-w-[80px] w-20 border-r border-border p-2 sticky left-0 bg-background z-10"></th>
                    {days.map((day) => {
                      const dayStr = format(day, "yyyy-MM-dd");
                      const daySessionCount = sessionsByDate[dayStr]?.length || 0;
                      
                      // Debug: Log all sessions for this day
                      if (daySessionCount > 0 && sessionsByDate[dayStr]) {
                        console.log(`All sessions for ${dayStr}:`, {
                          count: daySessionCount,
                          sessions: sessionsByDate[dayStr].map(s => ({
                            id: s.id,
                            _key: s._key,
                            startTime: s.startTime,
                            localHour: new Date(s.startTime).getHours(),
                            localTime: format(new Date(s.startTime), "HH:mm"),
                          }))
                        });
                      }
                      
                      return (
                        <th
                          key={day.toString()}
                          className={`min-w-[120px] border-r border-border p-2 text-center ${
                            isToday(day) ? "bg-muted" : ""
                          }`}
                        >
                          <div className="text-muted-foreground text-sm">
                            {format(day, "EEE", { locale: id })}
                          </div>
                          <div
                            className={`text-base sm:text-lg ${isToday(day) ? "font-bold text-primary" : "text-foreground"}`}
                          >
                            {format(day, "d/M")}
                          </div>
                          {daySessionCount > 0 && (
                            <div className="text-xs text-muted-foreground">
                              ({daySessionCount})
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map(({ label, hour }) => (
                    <tr key={`time-${hour}`} className="border-t border-border">
                      <td className="min-w-[80px] w-20 border-r border-border p-2 text-right font-medium text-muted-foreground sticky left-0 bg-background z-10 text-xs sm:text-sm">
                        {label}
                      </td>
                      {days.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        
                        // Get all sessions for this day and filter by hour
                        const daySessions = sessionsByDate[dateStr] || [];
                        const sessions = daySessions.filter((session) => {
                          if (!session?.startTime) return false;
                          // Parse the startTime and get the hour in local timezone
                          const startDate = new Date(session.startTime);
                          const sessionHour = startDate.getHours();
                          return sessionHour === hour;
                        });

                        // Debug log to see what's happening
                        if (sessions.length > 0) {
                          console.log(`Sessions for ${dateStr} at hour ${hour}:`, {
                            count: sessions.length,
                            sessions: sessions.map(s => ({
                              id: s.id,
                              _key: s._key,
                              startTime: s.startTime,
                              hour: new Date(s.startTime).getHours()
                            }))
                          });
                        }

                        return (
                          <td
                            key={`${dateStr}-${hour}`}
                            className={`min-w-[120px] h-[64px] border-r border-border p-1 align-top ${isToday(day) ? "bg-muted/50" : ""} ${onDateClick && sessions.length === 0 ? "cursor-pointer hover:bg-muted/30" : ""}`}
                            onClick={(e) => {
                              // Only trigger onDateClick if clicking on empty space (not on a session)
                              if (sessions.length === 0 && onDateClick) {
                                onDateClick(day);
                              }
                            }}
                          >
                            {sessions.map((session) => (
                              <div
                                key={session?._key || `session-${session?.id}`}
                                className={`rounded p-1 mb-1 cursor-pointer text-xs text-black hover:opacity-90 transition-colors ${
                                  session?.status === "ENDED"
                                    ? "bg-green-200 border border-green-400"
                                    : session?.status === "CANCELED"
                                    ? "bg-red-200 border border-red-400"
                                    : "bg-[#C9D953] hover:bg-[#B8C745]"
                                }`}
                                onClick={(e) => handleSessionClick(e, session)}
                              >
                                <div className="truncate font-medium">
                                  {session?.startTime ? format(new Date(session.startTime), "HH:mm") : "-"}
                                  {session?.status === "ENDED" && " ✓"}
                                  {session?.status === "CANCELED" && " ✗"}
                                </div>
                                <div className="truncate">
                                  {session?.type === "group"
                                    ? `${session?.groupName ?? "Group"} ${session?.attendanceCount ? `(${session.attendanceCount})` : ""}`
                                    : session?.member?.user?.name || "-"}
                                </div>
                                <div className="truncate text-[11px]">
                                  {session?.trainer?.user?.name || "-"}
                                </div>
                                {session?.exerciseResult && (
                                  <div className="truncate text-[10px] text-green-700 font-medium">
                                    📋 Exercise Results
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
          </div>
        )}

        {viewMode === "monthly" && (
          <div className="p-2 sm:p-4">
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(
                (day) => (
                  <div
                    key={day}
                    className="p-1 sm:p-2 text-center font-medium text-muted-foreground text-xs sm:text-sm"
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
                    className={`min-h-[80px] sm:min-h-[100px] rounded-md border border-border p-1 sm:p-2 ${!isCurrentMonth ? "opacity-40" : ""} ${isToday(day) ? "border-primary bg-primary/5" : ""} ${onDateClick && sessions.length === 0 ? "cursor-pointer hover:bg-muted" : ""} transition-colors`}
                    onClick={(e) => {
                      // Only trigger onDateClick if clicking on empty space
                      const target = e.target as HTMLElement;
                      if (sessions.length === 0 || target.classList.contains('text-right') || target.closest('.text-right')) {
                        onDateClick?.(day);
                      }
                    }}
                  >
                    <div
                      className={`text-right text-sm sm:text-base ${isToday(day) ? "font-bold text-primary" : ""}`}
                    >
                      {format(day, "d")}
                    </div>

                    <div className="mt-1 max-h-[60px] sm:max-h-[80px] space-y-1 overflow-y-auto">
                      {sessions.slice(0, 3).map((session) => (
                        <div
                          key={session?._key || `session-${session?.id}`}
                          className={`rounded p-1 cursor-pointer text-[10px] sm:text-xs text-black hover:opacity-90 transition-colors ${
                            session?.status === "ENDED"
                              ? "bg-green-200 border border-green-400"
                              : session?.status === "CANCELED"
                              ? "bg-red-200 border border-red-400"
                              : "bg-[#C9D953] hover:bg-[#B8C745]"
                          }`}
                          onClick={(e) => handleSessionClick(e, session)}
                        >
                          <div className="truncate font-medium">
                            {session?.startTime ? format(new Date(session.startTime), "HH:mm") : "-"}
                            {session?.status === "ENDED" && " ✓"}
                            {session?.status === "CANCELED" && " ✗"}
                          </div>
                          <div className="truncate">
                            {session?.type === "group"
                              ? `${session?.groupName ?? "Group"} ${session?.attendanceCount ? `(${session.attendanceCount})` : ""}`
                              : session?.member?.user?.name || "-"}
                          </div>
                          <div className="truncate text-[9px] sm:text-[10px]">
                            {session?.trainer?.user?.name || "-"}
                          </div>
                          {session?.exerciseResult && (
                            <div className="truncate text-[8px] sm:text-[9px] text-green-700 font-medium">
                              📋 Results
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
          onUpdate={(action?: string, session?: any) => {
            if (action === 'edit' && session) {
              onEditSession?.(session);
            } else {
              onRefreshData?.();
            }
            setSelectedSession(null);
          }}
        />
      )}
    </div>
  );
}
