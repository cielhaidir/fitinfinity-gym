"use client";

import { useState } from "react";
import { DataTable } from "@/components/datatable/data-table";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { columns } from "./columns";

export default function AttendanceTrackingPage() {
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");

  const { data: attendances = { items: [], total: 0, page: 1, limit: 10 } } = api.attendance.list.useQuery({
    page: 1,
    limit: 10,
    search,
    searchColumn,
    date,
  });

  const handlePaginationChange = (page: number, limit: number) => {
    // Handle pagination change
  };

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen bg-background">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Attendance Tracking
          </h2>
          <p className="text-muted-foreground">
            Monitor employee attendance records
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-[240px]"
          />
        </div>
      </div>
      <div className="rounded-md">
        <DataTable
          data={{
            items: attendances.items,
            total: attendances.total,
            page: attendances.page,
            limit: attendances.limit
          }}
          columns={columns}
          onPaginationChange={handlePaginationChange}
          searchColumns={[
            { id: "employee.user.name", placeholder: "Search by name..." },
          ]}
          onSearch={(value, column) => {
            setSearch(value);
            setSearchColumn(column);
          }}
        />
      </div>
    </div>
  );
}
