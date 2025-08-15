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
  onNavigate: (direction: "prev" | "next") => void;
  onViewModeChange: (mode: "monthly" | "weekly") => void;
  onToday: () => void;
  onRefreshData?: () => void;
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
}: CalendarProps) {
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  // Calculate ranges
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
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
                    {days.map((day) => (
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
                      </th>
                    ))}
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
                        const timeStr = `${hour.toString().padStart(2, "0")}:00`;
                        const key = `${dateStr}-${timeStr}`;
                        const sessions = sessionsByDateTime[key] || [];

                        return (
                          <td
                            key={`${dateStr}-${hour}`}
                            className={`min-w-[120px] h-[64px] border-r border-border p-1 align-top ${isToday(day) ? "bg-muted/50" : ""}`}
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
              {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(
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
                    className={`min-h-[80px] sm:min-h-[100px] rounded-md border border-border p-1 sm:p-2 ${!isCurrentMonth ? "opacity-40" : ""} ${isToday(day) ? "border-primary bg-primary/5" : ""} cursor-pointer hover:bg-muted transition-colors`}
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
          onUpdate={() => {
            onRefreshData?.();
            setSelectedSession(null);
          }}
        />
      )}
    </div>
  );
}
