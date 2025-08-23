"use client";

import React from "react";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import Calendar from "./components/calendar";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function MemberSchedulePage() {
  const { data: session } = useSession();

  const { data: trainerSessions, isLoading } =
    api.memberCalendar.getAll.useQuery(undefined, {
      enabled: !!session?.user,
    });

  // Group sessions by date and time
  const sessionsByDateTime: Record<string, any[]> = {};

  // Create a Map to track unique sessions
  const uniqueSessions = new Map();

  trainerSessions?.forEach((session) => {
    const dateStr = format(new Date(session.date), "yyyy-MM-dd");
    const timeStr = format(new Date(session.startTime), "HH:mm");
    const key = `${dateStr}T${timeStr}`;

    // Create a unique identifier for this session
    const sessionKey = `${session.memberId}-${session.trainerId}-${dateStr}-${timeStr}`;

    // Only add the session if we haven't seen this combination before
    if (!uniqueSessions.has(sessionKey)) {
      uniqueSessions.set(sessionKey, session);

      if (!sessionsByDateTime[key]) {
        sessionsByDateTime[key] = [];
      }

      // Add a unique identifier to the session object
      sessionsByDateTime[key].push({
        ...session,
        _uniqueKey: sessionKey,
      });
    }
  });

  return (
    <ProtectedRoute requiredPermissions={["menu:session"]}>
      <div className="relative p-4 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-black dark:text-white">
            Jadwal Latihan Anda
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Lihat jadwal latihan Anda dengan personal trainer
          </p>
        </div>

        {isLoading ? (
          <div className="py-8 text-center">Memuat jadwal...</div>
        ) : trainerSessions?.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Anda belum memiliki jadwal latihan
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
              Silakan berlangganan dengan personal trainer untuk mendapatkan
              jadwal latihan
            </p>
          </div>
        ) : (
          <Calendar sessionsByDateTime={sessionsByDateTime} />
        )}
      </div>
    </ProtectedRoute>
  );
}
