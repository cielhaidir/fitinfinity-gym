"use client";

import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Dumbbell,
  Clock,
  User,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMinutes,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CalendarEvent = {
  id: string;
  type: "CLASS_VISIT" | "GROUP_CLASS";
  title: string;
  schedule: Date;
  duration: number;
  status: string;
  instructorName: string;
  classTypeName: string | null;
  classTypeIcon: string | null;
  groupName: string | null;
  memberCount: number;
  limit: number | null;
};

const statusColor: Record<string, string> = {
  SCHEDULED: "bg-blue-500",
  ENDED: "bg-gray-500",
  CANCELLED: "bg-red-500",
};

const ClassCalendarPage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const { data: events, isLoading } = api.class.calendarEvents.useQuery(
    {
      startDate: calStart,
      endDate: calEnd,
    },
    { keepPreviousData: true },
  );

  const days = useMemo(
    () => eachDayOfInterval({ start: calStart, end: calEnd }),
    [calStart.getTime(), calEnd.getTime()],
  );

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events ?? []) {
      const key = format(new Date(ev.schedule), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key]!.push(ev as CalendarEvent);
    }
    return map;
  }, [events]);

  const dayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, "yyyy-MM-dd");
    return eventsByDay[key] ?? [];
  }, [selectedDay, eventsByDay]);

  const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  return (
    <ProtectedRoute requiredPermissions={["list:classes"]}>
      <div className="flex flex-col gap-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Jadwal Kelas</h1>
            <p className="text-sm text-muted-foreground">
              Kalender Class Visit &amp; Group Class
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="min-w-[180px] justify-center font-semibold"
              onClick={() => setCurrentMonth(new Date())}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              {format(currentMonth, "MMMM yyyy", { locale: localeId })}
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <Card className="p-4 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {dayNames.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold text-muted-foreground py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayEvts = eventsByDay[key] ?? [];
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const selected = selectedDay && isSameDay(day, selectedDay);

              return (
                <div
                  key={key}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[100px] p-1.5 cursor-pointer transition-colors ${
                    inMonth ? "bg-background" : "bg-muted/40"
                  } ${selected ? "ring-2 ring-primary ring-inset" : ""} hover:bg-muted/60`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-medium ${
                        today
                          ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                          : inMonth
                            ? "text-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    {dayEvts.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] h-4 px-1"
                      >
                        {dayEvts.length}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvts.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(ev);
                        }}
                        className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white cursor-pointer ${
                          ev.type === "CLASS_VISIT"
                            ? "bg-indigo-500 hover:bg-indigo-600"
                            : "bg-emerald-500 hover:bg-emerald-600"
                        }`}
                      >
                        {format(new Date(ev.schedule), "HH:mm")} {ev.title}
                      </div>
                    ))}
                    {dayEvts.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{dayEvts.length - 3} lainnya
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-indigo-500" />
              Class Visit
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              Group Class
            </div>
          </div>
        </Card>

        {/* Selected Day Detail */}
        {selectedDay && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">
              {format(selectedDay, "EEEE, d MMMM yyyy", { locale: localeId })}
              {dayEvents.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {dayEvents.length} kelas
                </Badge>
              )}
            </h3>
            {isLoading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Memuat...
              </div>
            ) : dayEvents.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Tidak ada kelas pada hari ini.
              </div>
            ) : (
              <div className="space-y-2">
                {dayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div
                      className={`w-1 h-12 rounded-full ${
                        ev.type === "CLASS_VISIT"
                          ? "bg-indigo-500"
                          : "bg-emerald-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {ev.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            ev.type === "CLASS_VISIT"
                              ? "border-indigo-400 text-indigo-500"
                              : "border-emerald-400 text-emerald-500"
                          }`}
                        >
                          {ev.type === "CLASS_VISIT"
                            ? "Class Visit"
                            : "Group Class"}
                        </Badge>
                        <Badge
                          className={`text-[10px] text-white ${statusColor[ev.status] ?? "bg-gray-500"}`}
                        >
                          {ev.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(ev.schedule), "HH:mm")} –{" "}
                          {format(
                            addMinutes(new Date(ev.schedule), ev.duration),
                            "HH:mm",
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {ev.instructorName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {ev.memberCount}
                          {ev.limit ? `/${ev.limit}` : ""} peserta
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Event Detail Dialog */}
        <Dialog
          open={!!selectedEvent}
          onOpenChange={(o) => {
            if (!o) setSelectedEvent(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                {selectedEvent?.title}
              </DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      selectedEvent.type === "CLASS_VISIT"
                        ? "border-indigo-400 text-indigo-500"
                        : "border-emerald-400 text-emerald-500"
                    }
                  >
                    {selectedEvent.type === "CLASS_VISIT"
                      ? "Class Visit"
                      : "Group Class"}
                  </Badge>
                  <Badge
                    className={`text-white ${statusColor[selectedEvent.status] ?? "bg-gray-500"}`}
                  >
                    {selectedEvent.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Tanggal</p>
                    <p className="font-medium">
                      {format(new Date(selectedEvent.schedule), "EEEE, d MMM yyyy", {
                        locale: localeId,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Waktu</p>
                    <p className="font-medium">
                      {format(new Date(selectedEvent.schedule), "HH:mm")} –{" "}
                      {format(
                        addMinutes(
                          new Date(selectedEvent.schedule),
                          selectedEvent.duration,
                        ),
                        "HH:mm",
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Durasi</p>
                    <p className="font-medium">{selectedEvent.duration} menit</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Instruktur</p>
                    <p className="font-medium">{selectedEvent.instructorName}</p>
                  </div>
                  {selectedEvent.classTypeName && (
                    <div>
                      <p className="text-xs text-muted-foreground">Tipe Kelas</p>
                      <p className="font-medium">{selectedEvent.classTypeName}</p>
                    </div>
                  )}
                  {selectedEvent.groupName && (
                    <div>
                      <p className="text-xs text-muted-foreground">Grup</p>
                      <p className="font-medium">{selectedEvent.groupName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Peserta</p>
                    <p className="font-medium">
                      {selectedEvent.memberCount}
                      {selectedEvent.limit ? ` / ${selectedEvent.limit}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
};

export default ClassCalendarPage;
