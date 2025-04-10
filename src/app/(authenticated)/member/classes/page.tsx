"use client"

import { useState } from "react"
import { api } from "@/trpc/react"
import { ClassCard } from "./class-card"
import { ClassDetailsDialog } from "./class-details-dialog"
import type { Class } from "./types"
import { Loader2 } from "lucide-react"

export default function MemberClassesPage() {
    const [selectedClass, setSelectedClass] = useState<Class | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const { data: classes, isLoading, error } = api.memberClass.list.useQuery(
        { page: 1, limit: 100 },
        {
            staleTime: 5000,
            refetchOnWindowFocus: false
        }
    )

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

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-black dark:text-white">Available Classes</h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Browse and register for upcoming fitness classes
                </p>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : upcomingClasses?.length === 0 ? (
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
                        />
                    ))}
                </div>
            )}

            <ClassDetailsDialog
                class_={selectedClass}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
            />
        </div>
    )
} 