"use client";

import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { DataTable } from "@/components/datatable/data-table";
import { columns } from "./columns";
import { Member } from "./schema";

export default function MemberListPage() {
  const { data: session } = useSession();
  const { data: members, isLoading } = api.personalTrainer.getMembers.useQuery(undefined, {
    enabled: !!session,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Transform data to match schema and DataTable structure
  const formattedData: {
    items: Member[];
    total: number;
    page: number;
    limit: number;
  } = {
    items: members?.map((member) => ({
      id: member.id,
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      remainingSessions: member.remainingSessions || 0,
      subscriptionEndDate: member.subscriptionEndDate || new Date().toISOString(),
    })) ?? [],
    total: members?.length || 0,
    page: 1,
    limit: 10,
  };

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen bg-background">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Member List</h2>
          <p className="text-muted-foreground">
            View and manage your members here
          </p>
        </div>
      </div>

      <div className="rounded-md">
        <DataTable
          columns={columns}
          data={formattedData}
          searchColumns={[
            { id: "name", placeholder: "Search by member name..." },
            { id: "email", placeholder: "Search by email..." },
          ]}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
} 