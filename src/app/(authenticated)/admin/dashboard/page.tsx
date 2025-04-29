"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import { api } from "@/trpc/react";

const DashboardPage: React.FC = () => {
  const { data, isLoading } = api.member.list.useQuery({ page: 1, limit: 1 });
  const totalMembers = data?.total ?? 0;

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome, Admin!</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-blue-500/20 p-3">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Members</p>
              <h2 className="text-2xl font-bold">
                {isLoading ? "..." : totalMembers}
              </h2>
            </div>
          </div>
        </Card>
        {/* You can add more cards for other admin stats here */}
      </div>
    </div>
  );
};

export default DashboardPage;
