"use client";

import { api } from "@/trpc/react";
import { DataTable } from "@/app/_components/datatable/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BarChart3, Users, UserCheck, Clock, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

interface ClassReportData {
  id: string;
  name: string;
  schedule: Date;
  limit: number | null;
  registeredCount: number;
  waitlistCount: number;
  availableSpots: number | null;
}

const columns: ColumnDef<ClassReportData>[] = [
  {
    accessorKey: "name",
    header: "Class Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "schedule",
    header: "Schedule",
    cell: ({ row }) => {
      const date = row.getValue("schedule") as Date;
      return (
        <div className="text-sm">
          {format(date, "PPP", { locale: id })}
          <br />
          <span className="text-muted-foreground">
            {format(date, "HH:mm")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "registeredCount",
    header: "Registered Members",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-green-500" />
        <span className="font-medium">{row.getValue("registeredCount")}</span>
      </div>
    ),
  },
  {
    accessorKey: "waitlistCount",
    header: "Waitlist",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-yellow-500" />
        <span className="font-medium">{row.getValue("waitlistCount")}</span>
      </div>
    ),
  },
  {
    accessorKey: "limit",
    header: "Class Limit",
    cell: ({ row }) => {
      const limit = row.getValue("limit") as number | null;
      return (
        <div className="text-center">
          {limit ? (
            <Badge variant="outline">{limit}</Badge>
          ) : (
            <Badge variant="secondary">Unlimited</Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "availableSpots",
    header: "Available Spots",
    cell: ({ row }) => {
      const availableSpots = row.getValue("availableSpots") as number | null;
      const registeredCount = row.getValue("registeredCount") as number;
      const limit = row.getValue("limit") as number | null;
      
      if (!limit) {
        return <Badge variant="secondary">Unlimited</Badge>;
      }
      
      const spotsLeft = availableSpots || 0;
      const isFull = spotsLeft === 0;
      const isAlmostFull = spotsLeft <= 3 && spotsLeft > 0;
      
      return (
        <Badge 
          variant={isFull ? "destructive" : isAlmostFull ? "secondary" : "default"}
        >
          {spotsLeft} spots left
        </Badge>
      );
    },
  },
];

export default function ClassMemberReportPage() {
  const [page, setPage] = useState(1);
  const [includePast, setIncludePast] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const limit = 20;

  // Helper function to validate and convert date
  const isValidDate = (dateString: string): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  // Prepare query parameters with date validation
  const queryParams = {
    page,
    limit,
    includePast,
    ...(startDate && isValidDate(startDate) && { startDate: new Date(startDate) }),
    ...(endDate && isValidDate(endDate) && { endDate: new Date(endDate) }),
  };

  const { data, isLoading, error } = api.memberClass.reportClassMemberCount.useQuery(queryParams);

  // Excel export mutation
  const exportMutation = api.memberClass.exportClassMemberReport.useMutation({
    onSuccess: (data: any) => {
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
    onError: (error: any) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const handleExport = () => {
    const exportParams = {
      includePast,
      ...(startDate && isValidDate(startDate) && { startDate: new Date(startDate) }),
      ...(endDate && isValidDate(endDate) && { endDate: new Date(endDate) }),
    };
    exportMutation.mutate(exportParams);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setIncludePast(false);
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
  };

  const totalRegistered = data?.items.reduce((sum, item) => sum + item.registeredCount, 0) || 0;
  const totalWaitlist = data?.items.reduce((sum, item) => sum + item.waitlistCount, 0) || 0;
  const totalClasses = data?.total || 0;

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">Error loading class report: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermissions={["report:class-member-report"]}>
      <div className="container mx-auto py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Class Member Report</h1>
            <p className="text-muted-foreground">
              Overview of member registrations and waitlists for all classes
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleExport}
              disabled={exportMutation.isPending}
              variant="outline"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {exportMutation.isPending ? "Exporting..." : "Export Excel"}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Filter classes by date range and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={startDate && !isValidDate(startDate) ? "border-red-500" : ""}
                />
                {startDate && !isValidDate(startDate) && (
                  <p className="text-xs text-red-500 mt-1">Please enter a valid date</p>
                )}
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={endDate && !isValidDate(endDate) ? "border-red-500" : ""}
                />
                {endDate && !isValidDate(endDate) && (
                  <p className="text-xs text-red-500 mt-1">Please enter a valid date</p>
                )}
              </div>
              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-past"
                    checked={includePast}
                    onCheckedChange={setIncludePast}
                  />
                  <Label htmlFor="include-past">Include past classes</Label>
                </div>
              </div>
              <div className="flex items-end">
                <Button onClick={clearFilters} variant="outline" className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClasses}</div>
              <p className="text-xs text-muted-foreground">
                {includePast ? "All classes" : "Upcoming classes"}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Registered</CardTitle>
              <UserCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRegistered}</div>
              <p className="text-xs text-muted-foreground">
                Members registered across all classes
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Waitlist</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalWaitlist}</div>
              <p className="text-xs text-muted-foreground">
                Members waiting for spots
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Class Details</CardTitle>
            <CardDescription>
              Detailed breakdown of member counts for each class
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={{
                items: data?.items || [],
                total: data?.total || 0,
                page: page,
                limit: limit,
              }}
              onPaginationChange={handlePaginationChange}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}