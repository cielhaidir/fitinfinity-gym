import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock, Users, CreditCard } from "lucide-react";
import type { Class } from "./types";

interface ClassCardProps {
  class_: Class;
  onClick: () => void;
  hasValidSubscription: boolean;
  isRegistrationEnabled?: boolean;
}

export function ClassCard({
  class_,
  onClick,
  hasValidSubscription,
  isRegistrationEnabled = true,
}: ClassCardProps) {
  const registeredCount = class_.registeredMembers?.length ?? 0;
  const availableSpots = class_.limit ? class_.limit - registeredCount : "∞";
  const isFull = class_.limit ? registeredCount >= class_.limit : false;

  return (
    <Card
      className={`transition-shadow ${
        isRegistrationEnabled
          ? "cursor-pointer hover:shadow-md"
          : "cursor-not-allowed opacity-60"
      }`}
      onClick={isRegistrationEnabled ? onClick : undefined}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className={isRegistrationEnabled ? "" : "text-gray-500"}>
            {class_.name}
          </CardTitle>
          <div className="flex gap-2">
            {/* {!isRegistrationEnabled && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Registration Opens H-1
              </Badge>
            )} */}
            {isFull ? (
              <Badge variant="destructive">Full</Badge>
            ) : (
              <Badge variant="secondary">{availableSpots} spots left</Badge>
            )}
            {!hasValidSubscription && (
              <Badge variant="outline" className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                Rp {class_.price.toLocaleString("id-ID")}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {new Date(class_.schedule).toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-2 h-4 w-4" />
            {new Date(class_.schedule).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            • {class_.duration} min
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
  );
}
