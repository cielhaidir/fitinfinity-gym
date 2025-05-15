"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { format, isValid, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, addWeeks, subWeeks } from "date-fns";
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

const style = document.createElement('style');
style.textContent = customScrollbarStyles;
document.head.appendChild(style);

export default function PTDashboardPage() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  
  const { data: members, isLoading: isMembersLoading } = api.personalTrainer.getMembers.useQuery(undefined, {
    enabled: !!session,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  const { data: trainerSessions, isLoading: isSessionsLoading } = api.trainerSession.getAll.useQuery(undefined, {
    enabled: !!session,
  });

  // Hitung jumlah member aktif (dengan remaining sessions > 0)
  const activeMembers = members?.filter(member => member.remainingSessions > 0).length ?? 0;
  const totalMembers = members?.length ?? 0;
  const inactiveMembers = totalMembers - activeMembers;

  // Group sessions by date
  const sessionsByDate: Record<string, any[]> = {};
  trainerSessions?.forEach(session => {
    const dateStr = format(new Date(session.date), 'yyyy-MM-dd');
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

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen bg-background">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">PT Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your training sessions and members
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Members
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              All time members
            </p>
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
            <div className="text-center py-4">Loading...</div>
          ) : (
            <div className="bg-[#232323] rounded-lg p-4">
              <div className="text-center mb-4 text-lg font-semibold">
                {format(weekStart, 'dd MMMM', { locale: id })} - {format(weekEnd, 'dd MMMM yyyy', { locale: id })}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const sessions = sessionsByDate[dateStr] || [];
                  
                  return (
                    <div
                      key={dateStr}
                      className={`
                        min-h-[300px] p-2 border border-[#2a2a2a] rounded-md
                        ${isToday(day) ? 'border-[#C9D953] bg-[#2a2a2a]' : ''}
                      `}
                    >
                      <div className={`text-center mb-2 ${isToday(day) ? 'text-[#C9D953] font-bold' : 'text-gray-400'}`}>
                        <div className="text-sm">{format(day, 'EEE', { locale: id })}</div>
                        <div className="text-lg">{format(day, 'd')}</div>
                      </div>
                      
                      <div className="space-y-1 max-h-[260px] overflow-y-auto custom-scrollbar">
                        {sessions.map((session) => (
                          <div 
                            key={session.id} 
                            className="p-2 bg-[#C9D953] text-black text-xs rounded hover:bg-[#b8c748] transition-colors"
                          >
                            <div className="font-medium">
                              {format(new Date(session.startTime), 'HH:mm')}
                            </div>
                            <div className="truncate">
                              {session.member.user.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
