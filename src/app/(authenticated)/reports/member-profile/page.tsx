"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/trpc/react";
import { format, differenceInYears } from "date-fns";
import { FileSpreadsheet, Filter, Search, X, Eye, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from "xlsx-js-style";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import { useToast } from "@/hooks/use-toast";

export default function MemberProfileReportPage() {
  const { toast } = useToast();

  // Filter form states (temp)
  const [tempSearch, setTempSearch] = useState<string>("");
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>();
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>();
  const [tempStatus, setTempStatus] = useState<string>("all");

  // Applied filter states
  const [search, setSearch] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [status, setStatus] = useState<string>("all");

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  // Detail view state
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Fetch member list
  const {
    data: memberListData,
    isLoading: isLoadingList,
    refetch,
  } = api.reports.memberProfile.search.useQuery({
    search: search || undefined,
    enrollmentFrom: startDate,
    enrollmentTo: endDate,
    status:
      status === "all"
        ? undefined
        : (status as "ACTIVE" | "EXPIRED" | "REVOKED"),
    page,
    pageSize,
  });

  // Fetch member detail
  const {
    data: memberDetail,
    isLoading: isLoadingDetail,
  } = api.reports.memberProfile.get.useQuery(
    { membershipId: selectedMembershipId! },
    { enabled: !!selectedMembershipId }
  );

  // Fetch all members for export (without pagination)
  const {
    data: exportData,
    isLoading: isLoadingExport,
    refetch: refetchExport,
  } = api.reports.memberProfile.exportAll.useQuery(
    {
      search: search || undefined,
      enrollmentFrom: startDate,
      enrollmentTo: endDate,
      status:
        status === "all"
          ? undefined
          : (status as "ACTIVE" | "EXPIRED" | "REVOKED"),
    },
    { enabled: false } // Only fetch when export button is clicked
  );

  // Apply filters handler
  const handleApplyFilters = () => {
    setSearch(tempSearch);
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setStatus(tempStatus);
    setPage(1);
    refetch();
  };

  // Reset filters handler
  const handleResetFilters = () => {
    setTempSearch("");
    setTempStartDate(undefined);
    setTempEndDate(undefined);
    setTempStatus("all");
    setSearch("");
    setStartDate(undefined);
    setEndDate(undefined);
    setStatus("all");
    setPage(1);
    refetch();
  };

  // Open member detail
  const handleViewDetails = (membershipId: string) => {
    setSelectedMembershipId(membershipId);
    setIsDetailDialogOpen(true);
  };

  // Close member detail
  const handleCloseDetail = () => {
    setIsDetailDialogOpen(false);
    setSelectedMembershipId(null);
  };

  // Export member list to Excel
  const exportListToExcel = async () => {
    // Trigger the export query
    const result = await refetchExport();
    
    if (!result.data || result.data.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }

    const workbook = XLSX.utils.book_new();

    const memberData = result.data.map((item) => ({
      "Member Name": item.name || "N/A",
      "Email": item.email || "N/A",
      "Phone": item.phone || "N/A",
      "Birth Date": item.birthDate
        ? format(new Date(item.birthDate), "yyyy-MM-dd")
        : "N/A",
      "Register Date": format(new Date(item.registerDate), "yyyy-MM-dd"),
      "Gender": item.gender || "N/A",
      "Points": item.point?.toString() || "0",
      "Status": item.isActive ? "Active" : "Inactive",
    }));

    const memberWorksheet = XLSX.utils.json_to_sheet(memberData);
    const memberCols = Object.keys(memberData[0] || {}).map((key) => ({
      wch: Math.max(key.length, 15),
    }));
    memberWorksheet["!cols"] = memberCols;
    XLSX.utils.book_append_sheet(workbook, memberWorksheet, "Members");

    // Report Info Sheet
    const reportInfo = [
      {
        Metric: "Generated At",
        Value: format(new Date(), "PPP p"),
      },
      {
        Metric: "Date Range",
        Value:
          startDate && endDate
            ? `${format(startDate, "PPP")} - ${format(endDate, "PPP")}`
            : "All Time",
      },
      {
        Metric: "Status Filter",
        Value: status === "all" ? "All" : status,
      },
      {
        Metric: "Total Members",
        Value: result.data.length.toString(),
      },
      {
        Metric: "Search Query",
        Value: search || "None",
      },
    ];

    const infoWorksheet = XLSX.utils.json_to_sheet(reportInfo);
    const infoCols = Object.keys(reportInfo[0] || {}).map((key) => ({
      wch: Math.max(key.length, 25),
    }));
    infoWorksheet["!cols"] = infoCols;
    XLSX.utils.book_append_sheet(workbook, infoWorksheet, "Report Info");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `member-profile-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    link.click();

    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Member list has been exported to Excel",
    });
  };

  // Export single member profile to Excel
  const exportMemberProfileToExcel = () => {
    if (!memberDetail) {
      toast({
        title: "No Data",
        description: "No member data to export",
        variant: "destructive",
      });
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Personal Information Sheet
    const personalInfo = [
      { Field: "Name", Value: memberDetail.membership.user.name || "N/A" },
      { Field: "Email", Value: memberDetail.membership.user.email || "N/A" },
      { Field: "Phone", Value: memberDetail.membership.user.phone || "N/A" },
      {
        Field: "Birth Date",
        Value: memberDetail.membership.user.birthDate
          ? format(new Date(memberDetail.membership.user.birthDate), "MMM dd, yyyy")
          : "N/A",
      },
      {
        Field: "Age",
        Value: memberDetail.membership.user.birthDate
          ? differenceInYears(new Date(), new Date(memberDetail.membership.user.birthDate)).toString()
          : "N/A",
      },
      { Field: "Gender", Value: memberDetail.membership.user.gender || "N/A" },
      { Field: "Address", Value: memberDetail.membership.user.address || "N/A" },
      { Field: "Points", Value: memberDetail.membership.user.point?.toString() || "0" },
      {
        Field: "Register Date",
        Value: format(new Date(memberDetail.membership.registerDate), "MMM dd, yyyy"),
      },
      { Field: "Status", Value: memberDetail.membership.isActive ? "Active" : "Inactive" },
    ];

    const personalWorksheet = XLSX.utils.json_to_sheet(personalInfo);
    XLSX.utils.book_append_sheet(workbook, personalWorksheet, "Personal Info");

    // Subscriptions Sheet
    if (memberDetail.subscriptions.length > 0) {
      const subscriptionData = memberDetail.subscriptions.map((sub) => ({
        "Package": sub.package.name,
        "Type": sub.package.type,
        "Start Date": format(new Date(sub.startDate), "yyyy-MM-dd"),
        "End Date": sub.endDate ? format(new Date(sub.endDate), "yyyy-MM-dd") : "No Expiry",
        "Remaining Sessions": sub.remainingSessions?.toString() || "N/A",
        "Status": sub.isActive ? "Active" : "Inactive",
        "Frozen": sub.isFrozen ? "Yes" : "No",
        "Trainer": sub.trainer?.name || "N/A",
        "Payment Amount": sub.payment?.totalPayment?.toString() || "N/A",
      }));

      const subscriptionWorksheet = XLSX.utils.json_to_sheet(subscriptionData);
      XLSX.utils.book_append_sheet(workbook, subscriptionWorksheet, "Subscriptions");
    }

    // Training Sessions Summary Sheet
    const sessionSummary = [
      { Metric: "Total Sessions", Value: memberDetail.trainerSessionsSummary.totalSessions.toString() },
      { Metric: "Completed Sessions", Value: memberDetail.trainerSessionsSummary.completedSessions.toString() },
      { Metric: "Canceled Sessions", Value: memberDetail.trainerSessionsSummary.canceledSessions.toString() },
      { Metric: "Upcoming Sessions", Value: memberDetail.trainerSessionsSummary.upcomingSessions.toString() },
    ];

    const sessionSummaryWorksheet = XLSX.utils.json_to_sheet(sessionSummary);
    XLSX.utils.book_append_sheet(workbook, sessionSummaryWorksheet, "Session Summary");

    // Attendance Summary Sheet
    const attendanceSummary = [
      { Metric: "Total Check-ins", Value: memberDetail.attendanceSummary.totalVisits.toString() },
      {
        Metric: "Last Check-in",
        Value: memberDetail.attendanceSummary.lastVisit
          ? format(new Date(memberDetail.attendanceSummary.lastVisit), "MMM dd, yyyy HH:mm")
          : "N/A",
      },
      {
        Metric: "Average Check-ins/Month",
        Value: memberDetail.attendanceSummary.averageVisitsPerMonth.toString(),
      },
    ];

    const attendanceSummaryWorksheet = XLSX.utils.json_to_sheet(attendanceSummary);
    XLSX.utils.book_append_sheet(workbook, attendanceSummaryWorksheet, "Attendance Summary");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `member-profile-${memberDetail.membership.user.name?.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    link.click();

    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Member profile has been exported to Excel",
    });
  };

  // Pagination helpers
  const totalPages = memberListData ? Math.ceil(memberListData.totalCount / pageSize) : 0;

  // Calculate age from birthdate
  const calculateAge = (birthDate: Date | null) => {
    if (!birthDate) return null;
    return differenceInYears(new Date(), new Date(birthDate));
  };

  if (isLoadingList && page === 1) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Member Profile Report</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermissions={["report:member-profile"]}>
      <div className="container mx-auto py-10 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Member Profile Report</h1>
            <p className="text-muted-foreground mt-1">
              View detailed member profiles and history
            </p>
          </div>
          <Button
            onClick={exportListToExcel}
            variant="outline"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={isLoadingExport}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isLoadingExport ? "Exporting..." : "Export Excel"}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Search and filter members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Name, email, phone, ID, RFID..."
                      value={tempSearch}
                      onChange={(e) => setTempSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={tempStartDate ? format(tempStartDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => setTempStartDate(e.target.value ? new Date(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={tempEndDate ? format(tempEndDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => setTempEndDate(e.target.value ? new Date(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={tempStatus} onValueChange={setTempStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                      <SelectItem value="REVOKED">Revoked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleResetFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
                <Button onClick={handleApplyFilters} disabled={isLoadingList}>
                  <Filter className="mr-2 h-4 w-4" />
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Members
              {memberListData && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({memberListData.totalCount} total)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Birth Date</TableHead>
                    <TableHead>Register Date</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingList ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center">
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : memberListData?.items && memberListData.items.length > 0 ? (
                    memberListData.items.map((item) => (
                      <TableRow key={item.membershipId}>
                        <TableCell>
                          <div className="font-medium">{item.user.name || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {item.user.email || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{item.user.phone || "-"}</div>
                        </TableCell>
                        <TableCell>
                          {item.user.birthDate
                            ? format(new Date(item.user.birthDate), "MMM dd, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(item.registerDate), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>{item.user.gender || "-"}</TableCell>
                        <TableCell>{item.user.point?.toLocaleString() || "0"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={item.isActive ? "default" : "destructive"}>
                            {item.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(item.membershipId)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                        No members found for the selected filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {memberListData && memberListData.totalCount > pageSize && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1} to{" "}
                  {Math.min(page * pageSize, memberListData.totalCount)} of{" "}
                  {memberListData.totalCount} entries
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1 || isLoadingList}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          disabled={isLoadingList}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages || isLoadingList}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Member Profile</DialogTitle>
              <DialogDescription>
                Comprehensive member information and history
              </DialogDescription>
            </DialogHeader>

            {isLoadingDetail ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : memberDetail ? (
              <div className="space-y-6">
                {/* Header with Export Button */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={memberDetail.membership.user.image || undefined} />
                      <AvatarFallback>
                        {memberDetail.membership.user.name?.charAt(0) || "M"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-2xl font-bold">
                        {memberDetail.membership.user.name || "N/A"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {memberDetail.membership.user.email || "N/A"}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={exportMemberProfileToExcel}
                    variant="outline"
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export Profile
                  </Button>
                </div>

                {/* Tabs for organized information */}
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="personal">Personal Info</TabsTrigger>
                    <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                    <TabsTrigger value="sessions">Training Sessions</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                  </TabsList>

                  {/* Personal Information Tab */}
                  <TabsContent value="personal" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Name</Label>
                            <p className="font-medium">{memberDetail.membership.user.name || "-"}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Email</Label>
                            <p className="font-medium">{memberDetail.membership.user.email || "-"}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Phone</Label>
                            <p className="font-medium">{memberDetail.membership.user.phone || "-"}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Birth Date</Label>
                            <p className="font-medium">
                              {memberDetail.membership.user.birthDate
                                ? format(new Date(memberDetail.membership.user.birthDate), "MMM dd, yyyy")
                                : "-"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Age</Label>
                            <p className="font-medium">
                              {calculateAge(memberDetail.membership.user.birthDate) || "-"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Gender</Label>
                            <p className="font-medium">{memberDetail.membership.user.gender || "-"}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Points</Label>
                            <p className="font-medium">{memberDetail.membership.user.point?.toLocaleString() || "0"}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Height</Label>
                            <p className="font-medium">
                              {memberDetail.membership.user.height
                                ? `${memberDetail.membership.user.height} cm`
                                : "-"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Weight</Label>
                            <p className="font-medium">
                              {memberDetail.membership.user.weight
                                ? `${memberDetail.membership.user.weight} kg`
                                : "-"}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <Label className="text-muted-foreground">Address</Label>
                            <p className="font-medium">{memberDetail.membership.user.address || "-"}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Register Date</Label>
                            <p className="font-medium">
                              {format(new Date(memberDetail.membership.registerDate), "MMM dd, yyyy")}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Status</Label>
                            <Badge variant={memberDetail.membership.isActive ? "default" : "destructive"}>
                              {memberDetail.membership.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {memberDetail.membership.fc && (
                            <>
                              <div>
                                <Label className="text-muted-foreground">Fitness Consultant</Label>
                                <p className="font-medium">{memberDetail.membership.fc.name}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">FC Email</Label>
                                <p className="font-medium">{memberDetail.membership.fc.email}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Subscriptions Tab */}
                  <TabsContent value="subscriptions" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Subscription History</CardTitle>
                        <CardDescription>
                          All subscriptions for this member
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {memberDetail.subscriptions.length > 0 ? (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Package</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Start Date</TableHead>
                                  <TableHead>End Date</TableHead>
                                  <TableHead>Remaining Sessions</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Trainer</TableHead>
                                  <TableHead>Payment</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {memberDetail.subscriptions.map((sub) => (
                                  <TableRow key={sub.id}>
                                    <TableCell className="font-medium">
                                      {sub.package.name}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={
                                          sub.package.type === "GYM_MEMBERSHIP"
                                            ? "default"
                                            : sub.package.type === "PERSONAL_TRAINER"
                                              ? "secondary"
                                              : "outline"
                                        }
                                      >
                                        {sub.package.type === "GYM_MEMBERSHIP"
                                          ? "Gym"
                                          : sub.package.type === "PERSONAL_TRAINER"
                                            ? "PT"
                                            : "Group"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {format(new Date(sub.startDate), "MMM dd, yyyy")}
                                    </TableCell>
                                    <TableCell>
                                      {sub.endDate
                                        ? format(new Date(sub.endDate), "MMM dd, yyyy")
                                        : "No Expiry"}
                                    </TableCell>
                                    <TableCell>
                                      {sub.remainingSessions ?? "-"}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={sub.isActive ? "default" : "destructive"}>
                                        {sub.isActive ? "Active" : "Inactive"}
                                      </Badge>
                                      {sub.isFrozen && (
                                        <Badge variant="outline" className="ml-1">
                                          Frozen
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>{sub.trainer?.name || "-"}</TableCell>
                                    <TableCell>
                                      {sub.payment
                                        ? `Rp ${sub.payment.totalPayment.toLocaleString()}`
                                        : "-"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-8">
                            No subscription history available
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Training Sessions Tab */}
                  <TabsContent value="sessions" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Training Sessions Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-4 mb-6">
                          <div className="text-center">
                            <p className="text-2xl font-bold">
                              {memberDetail.trainerSessionsSummary.totalSessions}
                            </p>
                            <p className="text-sm text-muted-foreground">Total</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                              {memberDetail.trainerSessionsSummary.completedSessions}
                            </p>
                            <p className="text-sm text-muted-foreground">Completed</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-red-600">
                              {memberDetail.trainerSessionsSummary.canceledSessions}
                            </p>
                            <p className="text-sm text-muted-foreground">Canceled</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">
                              {memberDetail.trainerSessionsSummary.upcomingSessions}
                            </p>
                            <p className="text-sm text-muted-foreground">Upcoming</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-semibold">Recent Sessions (Last 10)</h4>
                          {memberDetail.recentSessions.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Time</TableHead>
                                  <TableHead>Trainer</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {memberDetail.recentSessions.map((session) => (
                                  <TableRow key={session.id}>
                                    <TableCell>
                                      {format(new Date(session.date), "MMM dd, yyyy")}
                                    </TableCell>
                                    <TableCell>
                                      {format(new Date(session.startTime), "HH:mm")} - {format(new Date(session.endTime), "HH:mm")}
                                    </TableCell>
                                    <TableCell>{session.trainerName}</TableCell>
                                    <TableCell>
                                      <Badge variant={session.isGroup ? "outline" : "secondary"}>
                                        {session.isGroup ? "Group" : "Private"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={
                                          session.status === "ENDED"
                                            ? "default"
                                            : session.status === "CANCELED"
                                              ? "destructive"
                                              : "outline"
                                        }
                                      >
                                        {session.status}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-center text-muted-foreground py-4">
                              No training sessions yet
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Attendance Tab */}
                  <TabsContent value="attendance" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Attendance Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="text-center">
                            <p className="text-2xl font-bold">
                              {memberDetail.attendanceSummary.totalVisits}
                            </p>
                            <p className="text-sm text-muted-foreground">Total Check-ins</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">
                              {memberDetail.attendanceSummary.averageVisitsPerMonth}
                            </p>
                            <p className="text-sm text-muted-foreground">Avg/Month</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium">
                              {memberDetail.attendanceSummary.lastVisit
                                ? format(
                                    new Date(memberDetail.attendanceSummary.lastVisit),
                                    "MMM dd, yyyy"
                                  )
                                : "Never"}
                            </p>
                            <p className="text-sm text-muted-foreground">Last Check-in</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-semibold">Recent Attendance (Last 10)</h4>
                          {memberDetail.recentAttendances.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Check-in</TableHead>
                                  <TableHead>Check-out</TableHead>
                                  <TableHead>Facility</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {memberDetail.recentAttendances.map((att) => (
                                  <TableRow key={att.id}>
                                    <TableCell>
                                      {format(new Date(att.checkin), "MMM dd, yyyy HH:mm")}
                                    </TableCell>
                                    <TableCell>
                                      {att.checkout
                                        ? format(new Date(att.checkout), "MMM dd, yyyy HH:mm")
                                        : "-"}
                                    </TableCell>
                                    <TableCell>{att.facilityDescription || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-center text-muted-foreground py-4">
                              No attendance records yet
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Member not found
              </p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}