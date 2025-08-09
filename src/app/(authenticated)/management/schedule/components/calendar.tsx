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
}

export default function ManagerCalendar({
  currentDate,
  viewMode,
  sessionsByDateTime,
  sessionsByDate,
  onNavigate,
  onViewModeChange,
  onToday,
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
        </div>

        {viewMode === "weekly" && (
          <div className="overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-20 border-r border-border p-2"></th>
                  {days.map((day) => (
                    <th
                      key={day.toString()}
                      className={`border-r border-border p-2 text-center ${
                        isToday(day) ? "bg-muted" : ""
                      }`}
                    >
                      <div className="text-muted-foreground">
                        {format(day, "EEE", { locale: id })}
                      </div>
                      <div
                        className={`text-lg ${isToday(day) ? "font-bold text-primary" : "text-foreground"}`}
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
                    <td className="w-20 border-r border-border p-2 text-right font-medium text-muted-foreground">
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
                          className={`h-[64px] border-r border-border p-1 align-top ${isToday(day) ? "bg-muted/50" : ""}`}
                        >
                          {sessions.map((session) => (
                            <div
                              key={session?._key || `session-${session?.id}`}
                              className="bg-[#C9D953] rounded p-1 mb-1 cursor-pointer text-xs"
                              onClick={(e) => handleSessionClick(e, session)}
                            >
                              <div className="truncate">
                                {session?.startTime ? format(new Date(session.startTime), "HH:mm") : "-"}
                              </div>
                              <div className="truncate">
                                {session?.member?.user?.name || "-"}
                              </div>
                              <div className="truncate">
                                {session?.trainer?.user?.name || "-"}
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
        )}

        {viewMode === "monthly" && (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1">
              {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(
                (day) => (
                  <div
                    key={day}
                    className="p-2 text-center font-medium text-muted-foreground"
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
                    className={`min-h-[100px] rounded-md border border-border p-2 ${!isCurrentMonth ? "opacity-40" : ""} ${isToday(day) ? "border-primary" : ""} cursor-pointer hover:bg-muted`}
                  >
                    <div
                      className={`text-right ${isToday(day) ? "font-bold text-primary" : ""}`}
                    >
                      {format(day, "d")}
                    </div>

                    <div className="mt-1 max-h-[80px] space-y-1 overflow-y-auto">
                      {sessions.slice(0, 3).map((session) => (
                        <div
                          key={session?._key || `session-${session?.id}`}
                          className="bg-[#C9D953] rounded p-1 mb-1 cursor-pointer text-xs"
                          onClick={(e) => handleSessionClick(e, session)}
                        >
                          <div className="truncate">
                            {session?.startTime ? format(new Date(session.startTime), "HH:mm") : "-"}
                          </div>
                          <div className="truncate">
                            {session?.member?.user?.name || "-"}
                          </div>
                          <div className="truncate">
                            {session?.trainer?.user?.name || "-"}
                          </div>
                        </div>
                      ))}

                      {sessions.length > 3 && (
                        <div
                          key={`more-${dateStr}`}
                          className="text-center text-xs text-muted-foreground"
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
        />
      )}
    </div>
  );
}
