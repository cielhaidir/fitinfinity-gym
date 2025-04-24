"use client"

import { useState } from "react"
import { api } from "@/trpc/react"
import { ClassCard } from "./class-card"
import { ClassDetailsDialog } from "./class-details-dialog"
import type { Class } from "./types"
import { Loader2 } from "lucide-react"
import { PackageType, PaymentStatus } from "@prisma/client"
import { useSession } from "next-auth/react"

interface Subscription {
    id: string
    startDate: Date
    endDate: Date
    package: {
        type: PackageType
        trainerId?: string
    }
    payments: {
        status: PaymentStatus
    }[]
    member: {
        user: {
            email: string | null
        }
    }
}

export default function MemberClassesPage() {
    const [selectedClass, setSelectedClass] = useState<Class | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const { data: session } = useSession()

    const { data: classes, isLoading: classesLoading, error: classesError } = api.memberClass.list.useQuery(
        { page: 1, limit: 100 },
        {
            staleTime: 5000,
            refetchOnWindowFocus: false
        }
    )

    // Get all subscriptions
    const { data: subscriptions, isLoading: subsLoading } = api.subs.list.useQuery(
        { page: 1, limit: 100 },
        {
            staleTime: 5000,
            refetchOnWindowFocus: false
        }
    )

    // Check if current user has a valid subscription for a specific class
    const hasValidSubscription = (class_: Class) => {
        if (!subscriptions?.items || !session?.user?.email) return false

        const now = new Date()
        const validSubscriptions = subscriptions.items.filter((sub) => {
            const startDate = new Date(sub.startDate)
            const endDate = new Date(sub.endDate)
            const hasValidPayment = sub.payments?.some((p) => p.status === PaymentStatus.SUCCESS)
            const isUserSubscription = sub.member?.user?.email === session.user.email
            
            // Check if subscription is active, paid, and belongs to current user
            return now >= startDate && now <= endDate && hasValidPayment && isUserSubscription
        })

        // Check if any valid subscription gives access to this class
        return validSubscriptions.some((sub) => {
            // Gym membership gives access to all classes
            if (sub.package?.type === PackageType.GYM_MEMBERSHIP) {
                return true
            }

            // Personal trainer subscription gives access to their classes
            if (sub.package?.type === PackageType.PERSONAL_TRAINER && sub.package.trainerId) {
                return sub.package.trainerId === class_.trainerId
            }

            return false
        })
    }

    // Filter kelas yang belum lewat
    const upcomingClasses = classes?.items.filter(class_ => {
        const classDate = new Date(class_.schedule);
        const now = new Date();
        return classDate > now;
    });

    const handleClassClick = (class_: Class) => {
        setSelectedClass(class_)
        setIsDialogOpen(true)
    }

    if (classesLoading || subsLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (classesError) {
        return (
            <div className="text-center text-red-500">
                Error loading classes: {classesError.message}
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-black dark:text-white">Available Classes</h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Browse and register for upcoming fitness classes
                </p>
            </div>

            {upcomingClasses?.length === 0 ? (
                <div className="text-center text-gray-600 dark:text-gray-400">
                    No upcoming classes available at the moment
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {upcomingClasses?.map((class_) => (
                        <ClassCard
                            key={class_.id}
                            class_={class_}
                            onClick={() => handleClassClick(class_)}
                            hasValidSubscription={hasValidSubscription(class_)}
                        />
                    ))}
                </div>
            )}

            <ClassDetailsDialog
                class_={selectedClass}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                hasValidSubscription={selectedClass ? hasValidSubscription(selectedClass) : false}
            />
        </div>
    )
} 