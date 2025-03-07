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

    const handleClassClick = (class_: Class) => {
        setSelectedClass(class_)
        setIsDialogOpen(true)
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">Available Classes</h1>
                <p className="text-muted-foreground">
                    Browse and register for fitness classes
                </p>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : classes?.items.length === 0 ? (
                <div className="text-center text-muted-foreground">
                    No classes available at the moment
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classes?.items.map((class_) => (
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