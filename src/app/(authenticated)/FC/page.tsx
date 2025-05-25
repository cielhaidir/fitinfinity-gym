"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { DataTable } from "@/components/datatable/data-table";
import { getColumns } from "./columns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function FCDashboardPage() {
  const { data: session, status } = useSession();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");

  const { data: members = { items: [], total: 0, page: 1, limit: 10 }, isLoading } = api.fc.getMembers.useQuery(
    { page, limit, search, searchColumn },
    {
      enabled: status === "authenticated",
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
    }
  );

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    return <div>Please log in to access this page</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen bg-background">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Fitness Consultant Dashboard</h2>
          <p className="text-muted-foreground">
            View and manage your members here
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Members
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.total}</div>
            <p className="text-xs text-muted-foreground">
              Members under your management
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Members
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.items.filter(member => member.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <div className="rounded-md">
        <DataTable
          columns={getColumns()}
          data={members}
          searchColumns={[
            { id: "name", placeholder: "Search by member name..." },
            { id: "email", placeholder: "Search by email..." },
          ]}
          isLoading={isLoading}
          onPaginationChange={handlePaginationChange}
          onSearch={(value, column) => {
            setSearch(value);
            setSearchColumn(column);
            setPage(1); // Reset to first page when searching
          }}
        />
      </div>
    </div>
  );
}
