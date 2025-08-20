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
  addWeeks,
  subWeeks,
} from "date-fns";
import { id } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { SessionDetailModal } from "./session-detail-modal";
import { TrainerSession } from "@prisma/client";

type SessionStatus = "ENDED" | "NOT_YET" | "CANCELED" | "ONGOING";

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
    label: `${hour < 12 ? hour : hour === 12 ? 12 : hour - 12}${hour < 12 ? "am" : "pm"}`,
    hour,
  };
});

export default function Calendar({ sessionsByDateTime }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSession, setSelectedSession] =
    useState<SessionWithTrainer | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<SessionWithTrainer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleDayClick = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const daySessions: SessionWithTrainer[] = [];
    
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

  const handleCloseMobileModal = () => {
    setIsModalOpen(false);
    setSelectedDay(null);
    setSelectedSessions([]);
  };

  const getStatusColor = (
    status: SessionWithTrainer["status"],
    exerciseResult: string | null,
  ) => {
    if (exerciseResult) {
      return "bg-blue-500";
    }

    switch (status) {
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

  const getStatusText = (
    status: SessionWithTrainer["status"],
    exerciseResult: string | null,
  ) => {
    if (exerciseResult) {
      return "Hasil Terupload";
    }

    switch (status) {
      case "ENDED":
        return "Selesai";
      case "CANCELED":
        return "Dibatalkan";
      case "ONGOING":
        return "Sedang Berlangsung";
      default:
        return "";
    }
  };

  return (
    <div className="overflow-hidden rounded-lg bg-background">
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-border p-3 sm:p-4 gap-3 sm:gap-0">
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
          <Button
            onClick={handleToday}
            variant="secondary"
            className="h-8 text-xs px-2 sm:px-3"
          >
            today
          </Button>
        </div>

        <div className="rounded-full bg-muted px-2 sm:px-3 py-1 text-xs sm:text-sm text-foreground text-center">
          <span className="hidden sm:inline">
            {format(weekStart, "dd MMMM", { locale: id })} -{" "}
            {format(weekEnd, "dd MMMM yyyy", { locale: id })}
          </span>
          <span className="sm:hidden">
            {format(weekStart, "dd MMM", { locale: id })} -{" "}
            {format(weekEnd, "dd MMM yyyy", { locale: id })}
          </span>
        </div>
      </div>

      {/* Mobile view - Grid like PT schedule */}
      <div className="sm:hidden">
        <div className="rounded-lg bg-[#232323] p-3">
          <div className="mb-3 text-center text-base font-semibold">
            {format(weekStart, "dd MMM", { locale: id })} -{" "}
            {format(weekEnd, "dd MMM yyyy", { locale: id })}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const daySessions: SessionWithTrainer[] = [];
              
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
                  className={`aspect-square w-full rounded-md border border-[#2a2a2a] p-1 flex flex-col items-center justify-between focus:outline-none transition-colors hover:bg-[#2a2a2a] ${isToday(day) ? "border-[#C9D953] bg-[#2a2a2a]" : ""}`}
                >
                  <div className="flex flex-col items-center min-h-0 flex-1">
                    <div className="text-[10px] leading-none">
                      {format(day, "EEE", { locale: id }).slice(0, 2)}
                    </div>
                    <div className="text-sm font-medium">{format(day, "d")}</div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-0.5 mt-0.5 min-h-[8px]">
                    {daySessions.length > 0 &&
                      daySessions.slice(0, 3).map((session, idx) => (
                        <span
                          key={session._uniqueKey || idx}
                          className={`w-1.5 h-1.5 rounded-full ${getStatusColor(session.status, session.exerciseResult)}`}
                        />
                      ))}
                    {daySessions.length > 3 && (
                      <span className="text-[8px] text-gray-400">+{daySessions.length - 3}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop view - Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse min-w-[640px]">
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
                  const key = `${dateStr}T${timeStr}`;
                  const sessions = sessionsByDateTime[key] || [];

                  return (
                    <td
                      key={`${dateStr}-${hour}`}
                      className={`h-[64px] border-r border-border p-1 align-top ${isToday(day) ? "bg-muted/50" : ""} `}
                    >
                      {sessions.map((session) => (
                        <div
                          key={session._uniqueKey}
                          className={`${getStatusColor(session.status, session.exerciseResult)} cursor-pointer rounded p-1.5 text-foreground transition-colors`}
                          onClick={() => handleSessionClick(session)}
                        >
                          <div className="font-medium">
                            {format(new Date(session.startTime), "HH:mm")}
                          </div>
                          <div className="truncate">
                            {session.trainer?.user?.name || "Personal Trainer"}
                          </div>
                          {getStatusText(
                            session.status,
                            session.exerciseResult,
                          ) && (
                            <div className="mt-1 text-xs font-bold text-foreground">
                              {getStatusText(
                                session.status,
                                session.exerciseResult,
                              )}
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

      {/* Mobile Modal */}
      {isModalOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#232323] text-white rounded-t-lg sm:rounded-lg p-4 w-full max-w-sm border border-[#2a2a2a] shadow-lg relative max-h-[80vh] overflow-y-auto" style={{ boxShadow: "0 0 30px rgba(201, 217, 83, 0.3), 0 0 60px rgba(201, 217, 83, 0.1)" }}>
            <div className="flex justify-between items-center mb-3">
              <div className="font-bold text-base">
                {selectedDay && format(selectedDay, "EEEE, dd MMM yyyy", { locale: id })}
              </div>
              <button
                onClick={handleCloseMobileModal}
                className="text-gray-400 hover:text-[#C9D953] text-xl font-bold p-1 -m-1"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            {selectedSessions.length === 0 ? (
              <div className="text-gray-400 text-sm py-4 text-center">Tidak ada jadwal pada hari ini.</div>
            ) : (
              <ul className="space-y-2">
                {selectedSessions.map((session, idx) => (
                  <li
                    key={session._uniqueKey || idx}
                    className="border-b border-[#2a2a2a] pb-3 last:border-b-0 last:pb-0 cursor-pointer hover:bg-[#2a2a2a] p-2 rounded transition-colors"
                    onClick={() => {
                      setSelectedSession(session);
                      handleCloseMobileModal();
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-semibold text-[#C9D953] text-sm">
                        {session.trainer?.user?.name || "Personal Trainer"}
                      </div>
                      <div className="text-xs text-gray-300 ml-2 flex-shrink-0">
                        {format(new Date(session.startTime), "HH:mm")} - {format(new Date(session.endTime), "HH:mm")}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {session.status === "ONGOING" ? "Sedang Berlangsung" :
                       session.status === "ENDED" ? "Selesai" :
                       session.status === "CANCELED" ? "Dibatalkan" : "Belum Dimulai"}
                    </div>
                    {session.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {session.description}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <SessionDetailModal
        session={selectedSession}
        onClose={handleCloseModal}
      />
    </div>
  );
}
