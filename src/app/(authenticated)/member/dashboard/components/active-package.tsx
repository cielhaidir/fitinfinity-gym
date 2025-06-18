"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { differenceInDays } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function ActivePackage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Get membership first
  const { data: membership } = api.member.getMembership.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });

  // Then get active packages using membership id
  const { data: activePackages, isLoading } =
    api.memberUc.getActivePackage.useQuery(
      {
        memberId: membership?.id ?? "",
      },
      {
        enabled: !!membership?.id,
      },
    );

  const calculateProgress = (startDate: Date, endDate: Date) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Total duration in days
    const totalDuration = differenceInDays(end, start);
    // Days remaining until end
    const daysRemaining = differenceInDays(end, now);

    // Calculate percentage (inverted to show remaining time)
    const percentage = (daysRemaining / totalDuration) * 100;

    // Ensure the value is between 0 and 100
    return Math.max(0, Math.min(100, percentage));
  };

  const getRemainingDays = (endDate: Date) => {
    const now = new Date();
    return Math.max(0, differenceInDays(new Date(endDate), now));
  };

  const handleGetMembership = () => {
    if (session?.user?.id) {
      if (membership?.id) {
        router.push(`/checkout/${membership.id}`);
      } else {
        router.push(`/checkout/${session.user.id}`);
      }
    }
  };

  if (isLoading) {
    return (
      <Card className="col-span-1 p-6">
        <h3 className="mb-4 text-lg font-semibold">Active Package</h3>
        <div className="space-y-4">
          <div className="h-4 w-3/4 animate-pulse rounded-lg bg-secondary" />
          <div className="h-2 animate-pulse rounded-lg bg-secondary" />
          <div className="h-8 animate-pulse rounded-lg bg-secondary" />
        </div>
      </Card>
    );
  }

  if (!activePackages || activePackages.length === 0) {
    return (
      <Card className="col-span-1 p-6">
        <h3 className="mb-4 text-lg font-semibold">Active Packages</h3>
        <p className="text-muted-foreground">No active membership</p>
        <Button
          variant="outline"
          className="mt-4 w-full"
          onClick={handleGetMembership}
        >
          Get Membership
        </Button>
      </Card>
    );
  }

  return (
    <Card className={cn("col-span-1 p-6", "dark:bg-black dark:text-white")}>
      <h3 className="mb-4 text-lg font-semibold">Active Packages</h3>
      <div className="space-y-4">
        {activePackages.map((subscription) => {
          const isGymMembership = subscription.package.type === "GYM_MEMBERSHIP";
          const isTrainer = subscription.package.type === "PERSONAL_TRAINER";
          
          if (isGymMembership) {
            const progress = calculateProgress(
              subscription.startDate ?? new Date(),
              subscription.endDate ?? new Date(),
            );
            const remainingDays = getRemainingDays(subscription.endDate ?? new Date());
            
            return (
              <div key={subscription.id} className="border-b border-border pb-4 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{subscription.package.name}</p>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Gym
                  </span>
                </div>
                <Progress value={progress} className="my-2" />
                <p className="text-sm text-muted-foreground">
                  {remainingDays} Days Remaining
                </p>
              </div>
            );
          }
          
          if (isTrainer) {
            const remainingSessions = subscription.remainingSessions ?? 0;
            const totalSessions = subscription.package.sessions ?? 0;
            const usedSessions = totalSessions - remainingSessions;
            const sessionProgress = totalSessions > 0 ? (remainingSessions / totalSessions) * 100 : 0;
            
            return (
              <div key={subscription.id} className="border-b border-border pb-4 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{subscription.package.name}</p>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    PT
                  </span>
                </div>
                {subscription.trainer && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Trainer: {subscription.trainer.user.name}
                  </p>
                )}
                <Progress value={sessionProgress} className="my-2" />
                <p className="text-sm text-muted-foreground">
                  {remainingSessions} of {totalSessions} Sessions Remaining
                </p>
                <p className="text-xs text-muted-foreground">
                  {usedSessions} Sessions Used
                </p>
              </div>
            );
          }
          
          return null;
        })}
      </div>
      <Button
        variant="outline"
        className="mt-4 w-full border-0 bg-[#C4F82A] text-black hover:bg-[#b3e626]"
        onClick={handleGetMembership}
      >
        Get More Packages
      </Button>
    </Card>
  );
}
