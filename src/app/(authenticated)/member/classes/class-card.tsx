import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Clock, Users } from "lucide-react"
import type { Class } from "./types"

interface ClassCardProps {
    class_: Class
    onClick: () => void
}

export function ClassCard({ class_, onClick }: ClassCardProps) {
    const registeredCount = class_.registeredMembers?.length ?? 0
    const availableSpots = class_.limit ? class_.limit - registeredCount : "∞"
    const isFull = class_.limit ? registeredCount >= class_.limit : false

    return (
        <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={onClick}
        >
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle>{class_.name}</CardTitle>
                    {isFull ? (
                        <Badge variant="destructive">Full</Badge>
                    ) : (
                        <Badge variant="secondary">{availableSpots} spots left</Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {new Date(class_.schedule).toLocaleDateString(undefined, {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-2 h-4 w-4" />
                        {new Date(class_.schedule).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                        })} • {class_.duration} min
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="mr-2 h-4 w-4" />
                        {registeredCount}/{class_.limit ?? "∞"} registered
                    </div>
                    <div className="mt-4 text-sm font-medium">
                        Instructor: {class_.trainer.user.name}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
} 