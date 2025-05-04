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
    const { data: membership } = api.member.getMembership.useQuery(
        undefined, 
        { enabled: !!session?.user?.id }
    );

    // Then get active package using membership id
    const { data: activePackage, isLoading } = api.memberUc.getActivePackage.useQuery({
        memberId: membership?.id ?? "",
    }, {
        enabled: !!membership?.id,
    });

    const calculateProgress = (startDate: Date, endDate: Date) => {
        const now = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Total duration in days
        const totalDuration = differenceInDays(end, start);
        // Days elapsed since start
        const daysElapsed = differenceInDays(now, start);
        
        // Calculate percentage
        const percentage = (daysElapsed / totalDuration) * 100;
        
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

    if (!activePackage) {
        return (
            <Card className="col-span-1 p-6">
                <h3 className="mb-4 text-lg font-semibold">Active Package</h3>
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
    const progress = calculateProgress(
        activePackage.startDate ?? new Date(),
        activePackage.endDate ?? new Date()
    );
    const remainingDays = getRemainingDays(activePackage.endDate ?? new Date());

    return (
        <Card className={cn(
            "col-span-1 p-6",
            "dark:bg-black dark:text-white"
        )}>
            <h3 className="mb-4 text-lg font-semibold">Active Package</h3>
            <p className="text-muted-foreground">{activePackage.package.name}</p>
            <Progress 
                value={progress} 
                className="my-4" 
            />
            <p className="text-sm text-muted-foreground">{remainingDays} Days Remaining</p>
            <Button 
                variant="outline" 
                className="mt-4 w-full bg-[#C4F82A] text-black hover:bg-[#b3e626] border-0"
            >
                Upgrade Package
            </Button>
        </Card>
    );
} 