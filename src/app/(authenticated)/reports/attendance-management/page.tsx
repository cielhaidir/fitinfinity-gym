"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Download, Filter, Search, Users, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AttendanceReportPage() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState("employee" as "employee" | "device" | "fingerprint");
  const [attendanceType, setAttendanceType] = useState("all" as "all" | "checkin" | "checkout");
  const limit = 20;

  const { data, isLoading, refetch } = api.attendance.getAllHistory.useQuery({
    startDate,
    endDate,
    page,
    limit,
    search,
    searchType,
    attendanceType,
  });

  const { data: stats } = api.attendance.getStats.useQuery({
    startDate,
    endDate,
  });

  const exportMutation = api.attendance.exportToExcel.useMutation({
    onSuccess: (data: { buffer: number[]; filename: string }) => {
      // Create blob and download
      const blob = new Blob([Buffer.from(data.buffer)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Excel file downloaded successfully");
    },
    onError: (error: { message: string }) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const handleExport = () => {
    exportMutation.mutate({
      startDate,
      endDate,
      search,
      searchType,
      attendanceType,
    });
  };

  const handleFilter = () => {
    setPage(1);
    refetch();
  };

  const formatDateTime = (date: Date) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm:ss");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Report</h1>
          <p className="text-muted-foreground">
            Comprehensive employee fingerprint attendance analysis and reporting
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={exportMutation.isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          <Download className="mr-2 h-4 w-4" />
          {exportMutation.isPending ? "Exporting..." : "Export Excel"}
        </Button>
      </div>

      {/* Statistics Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                  <p className="text-2xl font-bold">{stats.totalRecords}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{stats.completedRecords}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Checked In Only</p>
                  <p className="text-2xl font-bold">{stats.checkedInOnly}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unique Employees</p>
                  <p className="text-2xl font-bold">{stats.uniqueEmployees}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                className="rounded-md border w-fit"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                className="rounded-md border w-fit"
              />
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label>Search Type</Label>
              <Select value={searchType} onValueChange={(value) => setSearchType(value as "employee" | "device" | "fingerprint")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee Name</SelectItem>
                  <SelectItem value="device">Device ID</SelectItem>
                  <SelectItem value="fingerprint">Fingerprint ID</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search by ${searchType}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Attendance Type */}
            <div className="space-y-2">
              <Label>Attendance Type</Label>
              <Select value={attendanceType} onValueChange={(value) => setAttendanceType(value as "all" | "checkin" | "checkout")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Records</SelectItem>
                  <SelectItem value="checkin">Check In Only</SelectItem>
                  <SelectItem value="checkout">Check Out Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleFilter} variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
            <Button
              onClick={() => {
                setStartDate(undefined);
                setEndDate(undefined);
                setSearch("");
                setSearchType("employee");
                setAttendanceType("all");
                setPage(1);
                refetch();
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            Employee Attendance Records
            {data && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({data.total} total records)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Fingerprint ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Device ID</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.items.map((attendance) => (
                      <TableRow key={attendance.id}>
                        <TableCell className="font-medium">
                          {attendance.employee.user.name}
                        </TableCell>
                        <TableCell>
                          {attendance.employee.fingerprintId ?? "-"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(attendance.date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          {attendance.checkIn ? formatDateTime(attendance.checkIn) : "-"}
                        </TableCell>
                        <TableCell>
                          {attendance.checkOut ? formatDateTime(attendance.checkOut) : "-"}
                        </TableCell>
                        <TableCell>{attendance.deviceId ?? "-"}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              attendance.checkOut
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {attendance.checkOut ? "Complete" : "Checked In"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data?.total ?? 0)} of {data?.total ?? 0} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm">Page</span>
                    <span className="text-sm font-medium">{page}</span>
                    <span className="text-sm">of</span>
                    <span className="text-sm font-medium">
                      {Math.ceil((data?.total ?? 0) / limit)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data || page * limit >= data.total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}