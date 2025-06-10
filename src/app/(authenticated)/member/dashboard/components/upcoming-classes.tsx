"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export function UpcomingClasses() {
  const router = useRouter();
  const { data: session } = useSession();

  // Get upcoming trainer sessions
  const { data: trainerSessions, isLoading } =
    api.memberCalendar.getAll.useQuery(undefined, {
      enabled: !!session?.user,
      refetchOnWindowFocus: true,
    });

  if (isLoading) {
    return (
      <Card className="col-span-1 p-6">
        <h3 className="mb-4 text-lg font-semibold">Upcoming Classes</h3>
        <div className="space-y-4">
          <div className="h-20 animate-pulse rounded-lg bg-secondary" />
          <div className="h-20 animate-pulse rounded-lg bg-secondary" />
          <div className="h-20 animate-pulse rounded-lg bg-secondary" />
        </div>
      </Card>
    );
  }

  // Filter and sort upcoming sessions
  const upcomingSessions = trainerSessions
    ?.filter((session) => new Date(session.startTime) > new Date())
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    )
    .slice(0, 3); // Show only 3 upcoming sessions

  return (
    <Card className="col-span-1 p-6">
      <h3 className="mb-4 text-lg font-semibold">Upcoming Classes</h3>
      <div className="space-y-4">
        {upcomingSessions && upcomingSessions.length > 0 ? (
          upcomingSessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-lg bg-secondary p-3"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium">Personal Training</p>
                  <p className="text-sm text-muted-foreground">
                    {format(
                      new Date(session.startTime),
                      "EEEE, d MMMM yyyy HH:mm",
                      { locale: id },
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Trainer: {session.trainer?.user?.name || "Personal Trainer"}
                  </p>
                  {session.description && (
                    <p className="text-xs text-muted-foreground">
                      {session.description}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="secondary">Scheduled</Badge>
            </div>
          ))
        ) : (
          <p className="text-center text-muted-foreground">
            No upcoming training sessions scheduled.
          </p>
        )}

        <Button
          className="mt-4 w-full bg-[#C9D953] text-black hover:bg-[#b8c748]"
          onClick={() => router.push("/member/calendar-session")}
        >
          <Calendar className="mr-2 h-4 w-4" />
          View Full Calendar
        </Button>
      </div>
    </Card>
  );
}
