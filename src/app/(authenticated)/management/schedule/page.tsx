"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { format, addWeeks, subWeeks, addMonths, subMonths } from "date-fns";
import ManagerCalendar from "./components/calendar";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function JadwalManagerPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("weekly");
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>("");

  // Ambil daftar semua trainer untuk filter
  const { data: trainers, isLoading: isLoadingTrainers } = api.managerCalendar.getAllTrainers.useQuery();
  
  // Ambil semua sesi personal trainer dari endpoint khusus manager
  const { data: allSessions, isLoading, refetch } = api.managerCalendar.getAll.useQuery({
    trainerId: selectedTrainerId || undefined,
  });

  const handleRefreshData = () => {
    refetch();
  };

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
    <ProtectedRoute requiredPermissions={["menu:trainers"]}>
      <div className="relative p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Jadwal Semua Sesi Personal Trainer</h1>
        <p className="text-muted-foreground">
          Lihat seluruh jadwal sesi personal trainer di sini. Hanya dapat melihat jadwal, tidak dapat menambah atau mengubah.
        </p>
      </div>

      {/* Filter Section */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label htmlFor="trainer-filter" className="text-sm font-medium text-foreground whitespace-nowrap">
            Filter Personal Trainer:
          </label>
          <select
            id="trainer-filter"
            value={selectedTrainerId}
            onChange={(e) => setSelectedTrainerId(e.target.value)}
            className="w-full sm:w-[250px] h-10 px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
            disabled={isLoadingTrainers}
          >
            <option value="">Semua Trainer</option>
            {trainers?.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.name}
              </option>
            ))}
          </select>
        </div>
        
        {selectedTrainerId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedTrainerId("")}
            className="w-full sm:w-auto"
          >
            Reset Filter
          </Button>
        )}
      </div>
      <ManagerCalendar
        currentDate={currentDate}
        viewMode={viewMode}
        sessionsByDateTime={sessionsByDateTime}
        sessionsByDate={sessionsByDate}
        onNavigate={handleNavigate}
        onViewModeChange={setViewMode}
        onToday={() => setCurrentDate(new Date())}
        onRefreshData={handleRefreshData}
      />
      </div>
    </ProtectedRoute>
  );
}
