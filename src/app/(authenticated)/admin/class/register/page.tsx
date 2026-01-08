"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { ClassCard } from "@/app/(authenticated)/member/classes/class-card";
import { Loader2 } from "lucide-react";

import type { Class } from "@/app/(authenticated)/member/classes/types";
import { AdminClassRegisterDialog } from "./register-dialog";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function AdminClassRegisterPage() {
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    data: classes,
    isLoading: classesLoading,
    error: classesError,
    refetch: refetchClasses,
  } = api.memberClass.list.useQuery({ page: 1, limit: 100 });

  const handleClassClick = (class_: Class) => {
    setSelectedClass(class_);
    setIsDialogOpen(true);
  };

  const handleDialogClose = async (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Refetch classes when dialog closes to get updated data
      await refetchClasses();
      setSelectedClass(null);
    }
  };

  const handleDataUpdate = async () => {
    // Refetch classes to get the latest data
    const result = await refetchClasses();
    // Update the selected class with the refreshed data
    if (selectedClass && result.data?.items) {
      const updatedClass = result.data.items.find(c => c.id === selectedClass.id);
      if (updatedClass) {
        setSelectedClass(updatedClass);
      }
    }
  };

  if (classesLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (classesError) {
    return (
      <div className="text-center text-red-500">
        Error loading classes: {classesError.message}
      </div>
    );
  }

  const upcomingClasses = classes?.items?.filter((class_) => {
    const classDate = new Date(class_.schedule);
    const now = new Date();
    return classDate > now;
  });

  return (
    <ProtectedRoute requiredPermissions={["menu:member"]}>
      <div className="container mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-black dark:text-white">
            Register Member to Class
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Select a class to register a member
          </p>
        </div>
        {upcomingClasses?.length === 0 ? (
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>No upcoming classes available at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingClasses?.map((class_) => (
              <ClassCard
                key={class_.id}
                class_={class_}
                onClick={() => handleClassClick(class_)}
                hasValidSubscription={true}
                isRegistrationEnabled={true}
              />
            ))}
          </div>
        )}
        <AdminClassRegisterDialog
          class_={selectedClass}
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          onDataUpdate={handleDataUpdate}
        />
      </div>
    </ProtectedRoute>
  );
}


