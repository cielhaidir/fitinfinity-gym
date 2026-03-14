"use client";

import { Card } from "@/components/ui/card";
import { Activity, Trophy, Calendar, Gauge } from "lucide-react";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  format,
  formatDistanceToNow,
  differenceInHours,
  differenceInMinutes,
} from "date-fns";
import { id } from "date-fns/locale";

export function StatsCards() {
  const { data: session } = useSession();
  const { data: userData, isLoading: isLoadingUser } =
    api.user.getById.useQuery(
      { id: session?.user?.id ?? "" },
      {
        enabled: !!session?.user?.id,
        refetchOnWindowFocus: true,
      },
    );

  // Get membership first
  const { data: membership } = api.member.getMembership.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });

  // Get attendance count for this year
  const { data: attendanceData, isLoading: isLoadingAttendance } =
    api.member.getAttendanceCount.useQuery(
      { memberId: membership?.id ?? "" },
      { enabled: !!membership?.id },
    );

  // Then get active package using membership id
  const { data: activePackage, isLoading: isLoadingPackage } =
    api.memberUc.getActivePackage.useQuery(
      {
        memberId: membership?.id ?? "",
      },
      {
        enabled: !!membership?.id,
      },
    );

  // Get upcoming sessions
  const { data: trainerSessions, isLoading: isLoadingSessions } =
    api.memberCalendar.getAll.useQuery(undefined, {
      enabled: !!session?.user,
      refetchOnWindowFocus: true,
    });

  // Member yang masih check in dan belum check out hari ini (hadir di gym)
  const { data: presentCount, isLoading: isLoadingPresent } =
    api.esp32.getPresentMembersCount.useQuery(undefined, {
      enabled: !!session?.user,
      refetchInterval: 60_000, // refresh tiap 1 menit
    });

  // Indikator kepadatan: low < 30, medium < 50, high < 70 (≥70 tetap high)
  const getOccupancyLevel = (count: number): "low" | "medium" | "high" => {
    if (count < 30) return "low";
    if (count < 50) return "medium";
    return "high";
  };
  const occupancyLevel = presentCount?.count != null ? getOccupancyLevel(presentCount.count) : null;
  const occupancyConfig = {
    low: { label: "Low", sublabel: "Quiet", iconBg: "bg-emerald-500/20", iconColor: "text-emerald-600" },
    medium: { label: "Medium", sublabel: "Moderate", iconBg: "bg-amber-500/20", iconColor: "text-amber-600" },
    high: { label: "High", sublabel: "Busy", iconBg: "bg-rose-500/20", iconColor: "text-rose-600" },
  } as const;

  const [nextClass, setNextClass] = useState<{
    time: string;
    trainer: string;
  } | null>(null);

  useEffect(() => {
    if (trainerSessions && trainerSessions.length > 0) {
      const now = new Date();
      const upcomingSessions = trainerSessions
        .filter((session) => new Date(session.startTime) > now)
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        );

      if (upcomingSessions.length > 0) {
        const nextSession = upcomingSessions[0]!;
        const startTime = new Date(nextSession.startTime);
        const hours = differenceInHours(startTime, now);
        const minutes = differenceInMinutes(startTime, now) % 60;

        let timeString = "";
        if (hours > 0) {
          timeString = `${hours}j ${minutes}m`;
        } else {
          timeString = `${minutes}m`;
        }

        setNextClass({
          time: timeString,
          trainer: nextSession.trainer?.user?.name || "Personal Trainer",
        });
      }
    }
  }, [trainerSessions]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-yellow-500/20 p-3">
            <Activity className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Workout This Year</p>
            <h2 className="text-2xl font-bold">
              {isLoadingAttendance ? "..." : (attendanceData?.count ?? 0)}
            </h2>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          {isLoadingPresent ? (
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-muted p-3">
                <Gauge className="h-6 w-6 text-muted-foreground animate-pulse" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gym Occupancy</p>
                <p className="text-lg font-medium text-muted-foreground">...</p>
              </div>
            </div>
          ) : occupancyLevel ? (
            <>
              <div className={`rounded-full p-3 ${occupancyConfig[occupancyLevel].iconBg}`}>
                <Gauge className={`h-6 w-6 ${occupancyConfig[occupancyLevel].iconColor}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gym Occupancy</p>
                <h2 className="text-2xl font-bold capitalize">{occupancyConfig[occupancyLevel].label}</h2>
                <p className="text-xs text-muted-foreground">{occupancyConfig[occupancyLevel].sublabel}</p>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-full bg-muted p-3">
                <Gauge className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gym Occupancy</p>
                <h2 className="text-2xl font-bold">—</h2>
                <p className="text-xs text-muted-foreground">No data</p>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-green-500/20 p-3">
            <Trophy className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Member Points</p>
            <h2 className="text-2xl font-bold">
              {isLoadingUser ? "..." : (userData?.point ?? 0)}
            </h2>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-blue-500/20 p-3">
            <Calendar className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Next Class</p>
            {isLoadingSessions ? (
              <h2 className="text-2xl font-bold">...</h2>
            ) : nextClass ? (
              <div>
                <h2 className="text-2xl font-bold">{nextClass.time}</h2>
                <p className="text-sm text-muted-foreground">
                  {nextClass.trainer}
                </p>
              </div>
            ) : (
              <h2 className="text-2xl font-bold">No upcoming classes</h2>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
