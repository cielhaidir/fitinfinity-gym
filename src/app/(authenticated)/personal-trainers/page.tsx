"use client";
//lmao you find me
import React from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  format,
  isValid,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
} from "date-fns";
import { id } from "date-fns/locale";
import { Button } from "@/components/ui/button";

const customScrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #1a1a1a;
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #C9D953;
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #b8c748;
  }
`;

const style = document.createElement("style");
style.textContent = customScrollbarStyles;
document.head.appendChild(style);

export default function PTDashboardPage() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = React.useState(new Date());

  // Modal state
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [selectedSessions, setSelectedSessions] = React.useState<any[]>([]);

  const { data: members, isLoading: isMembersLoading } =
    api.personalTrainer.getMembers.useQuery(undefined, {
      enabled: !!session,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
    });

  const { data: trainerSessions, isLoading: isSessionsLoading } =
    api.trainerSession.getAll.useQuery(undefined, {
      enabled: !!session,
    });

  // Hitung jumlah member aktif (dengan remaining sessions > 0)
  const activeMembers =
    members?.filter((member) => member.remainingSessions > 0).length ?? 0;
  const totalMembers = members?.length ?? 0;
  const inactiveMembers = totalMembers - activeMembers;

  // Group sessions by date
  const sessionsByDate: Record<string, any[]> = {};
  trainerSessions?.forEach((session) => {
    const dateStr = format(new Date(session.date), "yyyy-MM-dd");
    if (!sessionsByDate[dateStr]) {
      sessionsByDate[dateStr] = [];
    }
    sessionsByDate[dateStr].push(session);
  });

  // Calculate week days
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

  // Modal open handler
  const handleOpenModal = (day: Date, sessions: any[]) => {
    setSelectedDay(day);
    setSelectedSessions(sessions);
    setIsModalOpen(true);
  };

  // Modal close handler
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDay(null);
    setSelectedSessions([]);
  };

  return (
    <div className="container mx-auto min-h-screen bg-background p-4 md:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">PT Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your training sessions and members
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">All time members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Members
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMembers}</div>
            <p className="text-xs text-muted-foreground">
              Members with remaining sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inactive Members
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveMembers}</div>
            <p className="text-xs text-muted-foreground">
              Members without sessions
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Incoming Sessions
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isSessionsLoading ? (
            <div className="py-4 text-center">Loading...</div>
          ) : (
            <div className="rounded-lg bg-[#232323] p-4">
              <div className="mb-4 text-center text-lg font-semibold">
                {format(weekStart, "dd MMMM", { locale: id })} -{" "}
                {format(weekEnd, "dd MMMM yyyy", { locale: id })}
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 sm:gap-2">
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const sessions = sessionsByDate[dateStr] || [];
                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleOpenModal(day, sessions)}
                      className={`aspect-square w-full rounded-md border border-[#2a2a2a] p-1 sm:p-2 flex flex-col items-center justify-between focus:outline-none transition-colors ${isToday(day) ? "border-[#C9D953] bg-[#2a2a2a]" : ""}`}
                    >
                      <div className="flex flex-col items-center">
                        <div className="text-xs sm:text-sm">
                          {format(day, "EEE", { locale: id })}
                        </div>
                        <div className="text-base sm:text-lg">{format(day, "d")}</div>
                      </div>
                      <div className="flex flex-wrap justify-center gap-1 mt-1 min-h-[12px]">
                        {sessions.length > 0 &&
                          sessions.map((_, idx) => (
                            <span
                              key={idx}
                              className="w-2 h-2 bg-green-500 rounded-full"
                            />
                          ))}
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* Modal for session details */}
              {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="bg-[#232323] text-white rounded-lg p-4 max-w-xs w-full border border-[#2a2a2a] shadow-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-bold text-lg">
                        {selectedDay && format(selectedDay, "EEEE, dd MMM yyyy", { locale: id })}
                      </div>
                      <button onClick={handleCloseModal} className="text-gray-400 hover:text-[#C9D953] text-xl font-bold">✕</button>
                    </div>
                    {selectedSessions.length === 0 ? (
                      <div className="text-gray-400 text-sm">Tidak ada sesi pada hari ini.</div>
                    ) : (
                      <ul className="space-y-2">
                        {selectedSessions.map((session, idx) => (
                          <li key={session.id || idx} className="border-b border-[#2a2a2a] pb-2 last:border-b-0 last:pb-0">
                            <div className="font-semibold text-[#C9D953]">
                              {session.member?.user?.name || "-"}
                            </div>
                            <div className="text-xs text-gray-300">
                              {format(new Date(session.startTime), "HH:mm")} - {format(new Date(session.endTime), "HH:mm")}
                            </div>
                            <div className="text-xs text-gray-400">
                              {session.activity || "Sesi latihan"}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
