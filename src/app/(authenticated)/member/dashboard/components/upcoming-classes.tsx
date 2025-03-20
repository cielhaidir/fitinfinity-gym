"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, Waves, Calendar } from "lucide-react";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Type definition based on Prisma Class model
type Class = {
    id: string;
    name: string;
    limit: number | null;
    schedule: Date;
    duration: number;
    trainer: {
        user: {
            name: string;
        };
    };
    registeredMembers: {
        id: string;
        memberId: string;
    }[];
    _count: {
        registeredMembers: number;
    };
};

const getClassIcon = (className: string) => {
    switch (className.toLowerCase()) {
        case 'zumba':
            return <Dumbbell className="h-5 w-5" />;
        case 'yoga':
            return <Dumbbell className="h-5 w-5" />;
        case 'pilates':
            return <Dumbbell className="h-5 w-5" />;
        default:
            return <Dumbbell className="h-5 w-5" />;
    }
};

const formatSchedule = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

export function UpcomingClasses() {
    const router = useRouter();
    const { data: session } = useSession();
    const { data: classes, isLoading } = api.memberUc.list.useQuery({
        memberId: session?.user?.id ?? "",
        limit: 3
    }, {
        enabled: !!session?.user?.id,
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

    return (
        <Card className="col-span-1 p-6">
            <h3 className="mb-4 text-lg font-semibold">Upcoming Classes</h3>
            <div className="space-y-4">
                {classes?.map((classItem) => (
                    <div 
                        key={classItem.id}
                        className="flex items-center justify-between rounded-lg bg-secondary p-3"
                    >
                        <div className="flex items-center gap-3">
                            {getClassIcon(classItem.name)}
                            <div>
                                <p className="font-medium">{classItem.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {formatSchedule(classItem.schedule)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Trainer: {classItem.trainer.user.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {classItem._count.registeredMembers}/{classItem.limit} Members
                                </p>
                            </div>
                        </div>
                        <Badge variant="secondary">
                            {classItem.registeredMembers.length > 0 ? "Registered" : "Free"}
                        </Badge>
                    </div>
                ))}

                <Button 
                    className="w-full mt-4 bg-[#C9D953] hover:bg-[#b8c748] text-black"
                    onClick={() => router.push('/member/calendar-session')}
                >
                    <Calendar className="w-4 h-4 mr-2" />
                    View Full Calendar
                </Button>
            </div>
        </Card>
    );
} 