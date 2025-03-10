"use client";

import { StatsCards } from "./components/stats-cards";
import { UpcomingClasses } from "./components/upcoming-classes";
import { PersonalTrainerCard } from "./components/personal-trainer-card";
import { RewardsSection } from "./components/rewards-section";
import { ActivePackage } from "./components/active-package";

export default function MemberDashboard() {
    return (
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
    );
}
