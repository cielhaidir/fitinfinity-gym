"use client";

import { StatsCards } from "./dashboard/components/stats-cards";
import { UpcomingClasses } from "./dashboard/components/upcoming-classes";
import { PersonalTrainerCard } from "./dashboard/components/personal-trainer-card";
import { RewardsSection } from "./dashboard/components/rewards-section";
import { ActivePackage } from "./dashboard/components/active-package";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function MemberDashboard() {
  return (
    <ProtectedRoute requiredPermissions={["menu:dashboard-member"]}>
      <div className="flex flex-col gap-6 p-8">
        <div>
          <h1 className="text-2xl font-bold">Member Dashboard</h1>
          <p className="text-muted-foreground">Welcome to FitInfinity!</p>
        </div>

        <StatsCards />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ActivePackage />
          <UpcomingClasses />
          <PersonalTrainerCard />
        </div>

        <RewardsSection />
      </div>
    </ProtectedRoute>
  );
}
