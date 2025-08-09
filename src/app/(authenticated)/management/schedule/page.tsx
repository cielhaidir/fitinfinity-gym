"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { format, addWeeks, subWeeks, addMonths, subMonths } from "date-fns";
import ManagerCalendar from "./components/calendar";
import { toast } from "sonner";

export default function JadwalManagerPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("weekly");

  // Ambil semua sesi personal trainer dari endpoint khusus manager
  const { data: allSessions, isLoading } = api.managerCalendar.getAll.useQuery();

  // Group sessions by date and time
  const sessionsByDateTime: Record<string, any[]> = {};
  const sessionsByDate: Record<string, any[]> = {};

  allSessions?.forEach((session) => {
    const dateStr = format(new Date(session.date), "yyyy-MM-dd");
    const timeStr = format(new Date(session.startTime), "HH:mm");
    const key = `${dateStr}-${timeStr}`;

    if (!sessionsByDateTime[key]) {
      sessionsByDateTime[key] = [];
    }
    if (!sessionsByDate[dateStr]) {
      sessionsByDate[dateStr] = [];
    }

    const sessionWithKey = {
      ...session,
      _key: `session-${session.id}-${dateStr}-${timeStr}`,
    };

    sessionsByDateTime[key].push(sessionWithKey);
    sessionsByDate[dateStr].push(sessionWithKey);
  });

  const handleNavigate = (direction: "prev" | "next") => {
    if (viewMode === "weekly") {
      setCurrentDate(
        direction === "prev"
          ? subWeeks(currentDate, 1)
          : addWeeks(currentDate, 1),
      );
    } else {
      setCurrentDate(
        direction === "prev"
          ? subMonths(currentDate, 1)
          : addMonths(currentDate, 1),
      );
    }
  };

  return (
    <div className="relative p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Jadwal Semua Sesi Personal Trainer</h1>
        <p className="text-muted-foreground">
          Lihat seluruh jadwal sesi personal trainer di sini. Hanya dapat melihat jadwal, tidak dapat menambah atau mengubah.
        </p>
      </div>
      <ManagerCalendar
        currentDate={currentDate}
        viewMode={viewMode}
        sessionsByDateTime={sessionsByDateTime}
        sessionsByDate={sessionsByDate}
        onNavigate={handleNavigate}
        onViewModeChange={setViewMode}
        onToday={() => setCurrentDate(new Date())}
      />
    </div>
  );
}
