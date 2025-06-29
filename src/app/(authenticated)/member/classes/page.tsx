"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { ClassCard } from "./class-card";
import { ClassDetailsDialog } from "./class-details-dialog";
import type { Class } from "./types";
import { Loader2 } from "lucide-react";
import { PackageType, PaymentStatus } from "@prisma/client";
import { useSession } from "next-auth/react";

interface Subscription {
  id: string;
  startDate: Date;
  endDate: Date;
  package: {
    type: PackageType;
    trainerId?: string;
  };
  payments: {
    status: PaymentStatus;
  }[];
  member: {
    user: {
      email: string | null;
    };
  };
}

export default function MemberClassesPage() {
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: session } = useSession();

  const {
    data: classes,
    isLoading: classesLoading,
    error: classesError,
  } = api.memberClass.list.useQuery(
    { page: 1, limit: 100 },
    {
      staleTime: 5000,
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        console.log('Classes API success:', data);
      },
      onError: (error) => {
        console.error('Classes API error:', error);
      },
    },
  );

  // Get all subscriptions
  const { data: subscriptions, isLoading: subsLoading } =
    api.subs.list.useQuery(
      { page: 1, limit: 100 },
      {
        staleTime: 5000,
        refetchOnWindowFocus: false,
      },
    );

  // Check if current user has a valid subscription for a specific class
  // Only allow checkout for members with active subscription
  const hasValidSubscription = (class_: Class) => {
    if (!subscriptions?.items || !session?.user?.email) return false;

    const now = new Date();
    const validSubscriptions = subscriptions.items.filter((sub) => {
      const startDate = new Date(sub.startDate);
      const endDate = sub.endDate ? new Date(sub.endDate) : null;
      const hasValidPayment = sub.payments?.some(
        (p) => p.status === PaymentStatus.SUCCESS,
      );
      const isUserSubscription = sub.member?.user?.email === session.user.email;

      // Check if subscription is active, paid, and belongs to current user
      return (
        now >= startDate &&
        (endDate ? now <= endDate : true) && // Handle null endDate
        hasValidPayment &&
        isUserSubscription
      );
    });

    // Only allow if at least one valid subscription for GYM_MEMBERSHIP
    return validSubscriptions.some((sub) => sub.package?.type === PackageType.GYM_MEMBERSHIP);
  };

  // Check if class registration is enabled (H-1 only)
  const isRegistrationEnabled = (class_: Class) => {
    const classDate = new Date(class_.schedule);
    const now = new Date();
  
    // Set time to start of day for accurate comparison
    const classDayStart = new Date(classDate);
    classDayStart.setHours(0, 0, 0, 0);
  
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
  
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);
  
    // Enable registration if class is today (H-0) or tomorrow (H-1)
    return (
      classDayStart.getTime() === todayStart.getTime() ||
      classDayStart.getTime() === tomorrowStart.getTime()
    );
  };
  

  // Filter classes for next 7 days only
  const upcomingClasses = classes?.items.filter((class_) => {
    const classDate = new Date(class_.schedule);
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);
    
    console.log('Class:', class_.name, 'Schedule:', classDate, 'Now:', now, 'Future:', classDate > now);
    
    // Temporarily show all future classes for debugging
    return classDate > now;
    // Original filter: return classDate > now && classDate <= sevenDaysFromNow;
  });

  console.log('Total classes:', classes?.items?.length);
  console.log('Upcoming classes:', upcomingClasses?.length);
  console.log('Classes data:', classes);

  const handleClassClick = (class_: Class) => {
    setSelectedClass(class_);
    setIsDialogOpen(true);
  };

  if (classesLoading || subsLoading) {
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

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black dark:text-white">
          Available Classes
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Browse and register for upcoming fitness classes
        </p>
      </div>

      {/* Debug information */}
      {/* <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <p>Total classes from API: {classes?.items?.length || 0}</p>
        <p>Filtered upcoming classes: {upcomingClasses?.length || 0}</p>
        <p>Classes loading: {classesLoading ? 'Yes' : 'No'}</p>
        <p>Classes error: {classesError ? classesError.message : 'None'}</p>
      </div> */}

      {upcomingClasses?.length === 0 ? (
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p>No upcoming classes available at the moment</p>
          {classes?.items?.length > 0 && (
            <p className="mt-2 text-sm">
              Found {classes.items.length} total classes, but none are upcoming
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {upcomingClasses?.map((class_) => (
            <ClassCard
              key={class_.id}
              class_={class_}
              onClick={() => handleClassClick(class_)}
              hasValidSubscription={hasValidSubscription(class_)}
              isRegistrationEnabled={isRegistrationEnabled(class_)}
            />
          ))}
        </div>
      )}

      <ClassDetailsDialog
        class_={selectedClass}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        hasValidSubscription={
          selectedClass ? hasValidSubscription(selectedClass) : false
        }
        isRegistrationEnabled={
          selectedClass ? isRegistrationEnabled(selectedClass) : false
        }
      />
    </div>
  );
}
