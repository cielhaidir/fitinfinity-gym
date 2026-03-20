"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dumbbell,
  Clock,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Timer,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function TrainingHistoryPage() {
  const { data: session } = useSession();

  // Gym check-in state
  const [checkinPage, setCheckinPage] = useState(1);
  const [checkinLimit] = useState(10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // PT sessions data
  const { data: ptSessions, isLoading: ptLoading } =
    api.memberCalendar.getAll.useQuery(undefined, {
      enabled: !!session?.user,
    });

  // Gym check-in data
  const { data: checkinData, isLoading: checkinLoading } =
    api.esp32.getMemberCheckinHistory.useQuery(
      {
        page: checkinPage,
        limit: checkinLimit,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      },
      {
        enabled: !!session?.user,
      },
    );

  // Separate PT sessions into upcoming and past
  const now = new Date();
  const pastPtSessions = (ptSessions ?? [])
    .filter((s) => new Date(s.date) < now || s.status === "ENDED")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const upcomingPtSessions = (ptSessions ?? [])
    .filter((s) => new Date(s.date) >= now && s.status !== "ENDED")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Stats
  const totalCheckins = checkinData?.totalCount ?? 0;
  const totalPtSessions = ptSessions?.length ?? 0;
  const completedPtSessions =
    ptSessions?.filter((s) => s.status === "ENDED").length ?? 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ENDED":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Selesai
          </Badge>
        );
      case "CANCELED":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" /> Dibatalkan
          </Badge>
        );
      case "ONGOING":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Timer className="mr-1 h-3 w-3" /> Berlangsung
          </Badge>
        );
      case "NOT_YET":
      default:
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" /> Belum Dimulai
          </Badge>
        );
    }
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), "EEEE, dd MMM yyyy", { locale: localeID });
  };

  const formatTime = (date: Date | string) => {
    return format(new Date(date), "HH:mm");
  };

  const formatDuration = (start: Date | string, end: Date | string) => {
    const diff =
      new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}j ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <ProtectedRoute requiredPermissions={["menu:dashboard-member"]}>
      <div className="container mx-auto min-h-screen bg-background p-2 sm:p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Riwayat Latihan
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Lihat riwayat kehadiran gym dan sesi latihan personal trainer Anda
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3 sm:mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Check-in Gym
              </CardTitle>
              <LogIn className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold sm:text-2xl">
                {totalCheckins}
              </div>
              <p className="text-xs text-muted-foreground">
                Kunjungan ke gym
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Sesi PT Selesai
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold sm:text-2xl">
                {completedPtSessions}
              </div>
              <p className="text-xs text-muted-foreground">
                Dari {totalPtSessions} total sesi
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Sesi Mendatang
              </CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold sm:text-2xl">
                {upcomingPtSessions.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Jadwal yang akan datang
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="checkin" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="checkin" className="text-xs sm:text-sm">
              <LogIn className="mr-1.5 h-4 w-4" />
              Check-in Gym
            </TabsTrigger>
            <TabsTrigger value="pt-sessions" className="text-xs sm:text-sm">
              <Dumbbell className="mr-1.5 h-4 w-4" />
              Sesi Personal Trainer
            </TabsTrigger>
          </TabsList>

          {/* Gym Check-in Tab */}
          <TabsContent value="checkin" className="space-y-4">
            {/* Date Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Dari Tanggal
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setCheckinPage(1);
                      }}
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Sampai Tanggal
                    </label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setCheckinPage(1);
                      }}
                    />
                  </div>
                  {(startDate || endDate) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                        setCheckinPage(1);
                      }}
                      className="w-full sm:w-auto"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Check-in List */}
            <Card>
              <CardContent className="p-0">
                {checkinLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Memuat data check-in...
                  </div>
                ) : !checkinData?.data || checkinData.data.length === 0 ? (
                  <div className="p-8 text-center">
                    <LogIn className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Belum ada riwayat check-in
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Kunjungi gym dan tap kartu RFID Anda untuk check-in
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {checkinData.data.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                            <LogIn className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {formatDate(log.checkin)}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                Check-in: {formatTime(log.checkin)}
                              </span>
                              {log.checkout && (
                                <>
                                  <span>•</span>
                                  <span>
                                    Check-out: {formatTime(log.checkout)}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    Durasi:{" "}
                                    {formatDuration(log.checkin, log.checkout)}
                                  </span>
                                </>
                              )}
                            </div>
                            {log.facilityDescription && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {log.facilityDescription}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          {log.checkout ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <LogOut className="mr-1 h-3 w-3" /> Selesai
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              <LogIn className="mr-1 h-3 w-3" /> Check-in
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {checkinData && checkinData.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t p-3 sm:p-4">
                    <p className="text-xs text-muted-foreground">
                      Halaman {checkinData.currentPage} dari{" "}
                      {checkinData.totalPages} ({checkinData.totalCount} data)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={checkinPage <= 1}
                        onClick={() =>
                          setCheckinPage((p) => Math.max(1, p - 1))
                        }
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={checkinPage >= (checkinData.totalPages ?? 1)}
                        onClick={() => setCheckinPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PT Sessions Tab */}
          <TabsContent value="pt-sessions" className="space-y-4">
            {/* Upcoming Sessions */}
            {upcomingPtSessions.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Jadwal Mendatang
                </h3>
                <Card>
                  <CardContent className="p-0 divide-y">
                    {upcomingPtSessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                            <CalendarDays className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {formatDate(s.date)}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {formatTime(s.startTime)} -{" "}
                                {formatTime(s.endTime)}
                              </span>
                              <span>•</span>
                              <span>
                                {formatDuration(s.startTime, s.endTime)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Trainer: {s.trainer?.user?.name ?? "N/A"}
                            </p>
                            {s.description && (
                              <p className="mt-0.5 text-xs text-muted-foreground italic">
                                {s.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>{getStatusBadge(s.status)}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Past Sessions */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Riwayat Sesi
              </h3>
              <Card>
                <CardContent className="p-0">
                  {ptLoading ? (
                    <div className="p-8 text-center text-muted-foreground">
                      Memuat data sesi...
                    </div>
                  ) : pastPtSessions.length === 0 ? (
                    <div className="p-8 text-center">
                      <Dumbbell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Belum ada riwayat sesi latihan
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Sesi latihan dengan personal trainer akan muncul di sini
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {pastPtSessions.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                              <Dumbbell className="h-5 w-5 text-green-600 dark:text-green-300" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {formatDate(s.date)}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>
                                  {formatTime(s.startTime)} -{" "}
                                  {formatTime(s.endTime)}
                                </span>
                                <span>•</span>
                                <span>
                                  {formatDuration(s.startTime, s.endTime)}
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Trainer: {s.trainer?.user?.name ?? "N/A"}
                              </p>
                              {s.description && (
                                <p className="mt-0.5 text-xs text-muted-foreground italic">
                                  {s.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div>{getStatusBadge(s.status)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}
