"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
Calendar
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";

export default function AttendanceHistoryPage() {
  const searchParams = useSearchParams();
  const employeeId = searchParams.get("employeeId");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = api.employee.getAttendanceHistory.useQuery(
    {
      employeeId: employeeId ?? "",
      startDate,
      endDate,
      page,
      limit,
    },
    {
      enabled: !!employeeId,
    }
  );

  if (!employeeId) {
    return <div>No employee selected</div>;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-4 text-2xl font-bold">Attendance History</h1>
      
      <div className="mb-6 flex gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Start Date</label>
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={setStartDate}
            className="rounded-md border"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">End Date</label>
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={setEndDate}
            className="rounded-md border"
          />
        </div>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Device</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((attendance) => (
                <TableRow key={attendance.id}>
                  <TableCell>
                    {format(new Date(attendance.date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    {format(new Date(attendance.checkIn), "HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    {attendance.checkOut
                      ? format(new Date(attendance.checkOut), "HH:mm:ss")
                      : "-"}
                  </TableCell>
                  <TableCell>{attendance.deviceId ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span>
              Page {page} of {Math.ceil((data?.total ?? 0) / limit)}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data || page * limit >= data.total}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}