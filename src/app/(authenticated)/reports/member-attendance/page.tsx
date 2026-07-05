"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from "date-fns";
import { toast } from "sonner";
import { Pencil, Download, Calendar, Search, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

type MemberCheckinLog = {
  id: string;
  checkin: string | Date;
  checkout: string | Date | null;
  memberId: string;
  memberName: string | null;
  userName: string | null;
  facilityDescription: string | null;
  status: string;
};

export default function MemberAttendanceReportPage() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [lokerSelection, setLokerSelection] = useState<string>("None");
  const [lokerNumber, setLokerNumber] = useState<string>("");
  const [handukSelection, setHandukSelection] = useState<string>("None");
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(50);
  
  // Format facility description based on loker and handuk selections
  const formatFacilityDescription = (lokerSel: string, lokerNum: string, handuk: string): string => {
    const parts: string[] = [];
    
    if (lokerSel === "Number" && lokerNum.trim()) {
      parts.push(`Loker = ${lokerNum.trim()}`);
    }
    
    if (handuk !== "None") {
      parts.push(`Handuk = ${handuk}`);
    }
    
    return parts.length > 0 ? parts.join(", ") : "";
  };

  const facilityFilter = formatFacilityDescription(lokerSelection, lokerNumber, handukSelection);
  
  // Rekap Kehadiran states
  const [recapStartDate, setRecapStartDate] = useState<string>("");
  const [recapEndDate, setRecapEndDate] = useState<string>("");
  const [recapSearch, setRecapSearch] = useState<string>("");
  const [recapTempSearch, setRecapTempSearch] = useState<string>("");
  const [recapAppliedStart, setRecapAppliedStart] = useState<Date | undefined>();
  const [recapAppliedEnd, setRecapAppliedEnd] = useState<Date | undefined>();
  const [recapPage, setRecapPage] = useState<number>(1);
  const recapPageSize = 25;

  const {
    data: recapData,
    isLoading: isLoadingRecap,
    refetch: refetchRecap,
  } = api.reports.attendanceSummary.useQuery({
    startDate: recapAppliedStart,
    endDate: recapAppliedEnd,
    search: recapSearch || undefined,
    page: recapPage,
    pageSize: recapPageSize,
  });

  const handleApplyRecap = () => {
    setRecapAppliedStart(recapStartDate ? new Date(recapStartDate) : undefined);
    setRecapAppliedEnd(recapEndDate ? new Date(recapEndDate) : undefined);
    setRecapSearch(recapTempSearch);
    setRecapPage(1);
  };

  const handleClearRecap = () => {
    setRecapStartDate("");
    setRecapEndDate("");
    setRecapTempSearch("");
    setRecapSearch("");
    setRecapAppliedStart(undefined);
    setRecapAppliedEnd(undefined);
    setRecapPage(1);
  };

  const handleDownloadRecap = () => {
    if (!recapData?.items || recapData.items.length === 0) {
      toast.error("No data to download");
      return;
    }
    const headers = ["Rank", "Member Name", "Email", "Phone", "Total Check-ins"];
    const csvContent = [
      headers.join(","),
      ...recapData.items.map((item) =>
        [
          item.rank,
          item.memberName ?? "",
          item.memberEmail ?? "",
          item.memberPhone ?? "",
          item.totalCheckins,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `rekap-kehadiran-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { data, isLoading, error, refetch } = api.esp32.getMemberCheckinLogs.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    facilityDescription: facilityFilter || undefined,
    page: currentPage,
    limit: itemsPerPage,
  });
  
  
  const updateMutation = api.esp32.updateMemberCheckinLog.useMutation();
  const checkoutMutation = api.esp32.manualCheckout.useMutation();
  const [editingLog, setEditingLog] = useState<MemberCheckinLog | null>(null);
  const [editCheckin, setEditCheckin] = useState<string>("");
  const [editFacility, setEditFacility] = useState<string>("");

  // Prepare editing dialog
  const openEditDialog = (log: MemberCheckinLog) => {
    setEditingLog(log);
    setEditCheckin(
      typeof log.checkin === "string"
        ? log.checkin.slice(0, 16)
        : new Date(log.checkin).toISOString().slice(0, 16)
    );
    setEditFacility(log.facilityDescription ?? "");
  };

  const handleSave = async () => {
    if (!editingLog) return;
    try {
      await updateMutation.mutateAsync({
        id: editingLog.id,
        facilityDescription: editFacility,
      });
      toast.success("Check-in log updated");
      setEditingLog(null);
      await refetch();
    } catch (err: any) {
      toast.error("Failed to update log");
    }
  };

  const handleWeekNavigation = (direction: 'prev' | 'next' | 'current') => {
    if (direction === 'current') {
      setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    } else if (direction === 'prev') {
      setCurrentWeekStart(prev => startOfWeek(subWeeks(prev, 1), { weekStartsOn: 1 }));
    } else {
      setCurrentWeekStart(prev => startOfWeek(addWeeks(prev, 1), { weekStartsOn: 1 }));
    }
  };

  const handleWeeklyReport = () => {
    const weekStart = format(currentWeekStart, "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "yyyy-MM-dd");
    setStartDate(weekStart);
    setEndDate(weekEnd);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleDownloadReport = () => {
    if (!data?.data || data.data.length === 0) {
      toast.error("No data to download");
      return;
    }

    const headers = ["Check-in Time", "Checkout Time", "Status", "Member ID", "Member Name", "User Name", "Facility Description"];
    const csvContent = [
      headers.join(","),
      ...data.data.map((log: MemberCheckinLog) => [
        format(new Date(log.checkin), "yyyy-MM-dd HH:mm"),
        log.checkout ? format(new Date(log.checkout), "yyyy-MM-dd HH:mm") : "",
        log.status,
        log.memberId,
        log.memberName || "",
        log.userName || "",
        log.facilityDescription || ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `member-attendance-report-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setLokerSelection("None");
    setLokerNumber("");
    setHandukSelection("None");
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setCurrentPage(1); // Reset to first page when clearing filters
  };

  const handleApplyFilters = () => {
    setCurrentPage(1); // Reset to first page when applying filters
    refetch();
  };

  return (
    <ProtectedRoute requiredPermissions={["report:member-attendance"]}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Member Attendance Report</h1>
            <p className="text-muted-foreground">
              View and analyze member check-in attendance records
            </p>
          </div>
        </div>

        <Tabs defaultValue="log">
          <TabsList className="mb-4">
            <TabsTrigger value="log">Detail Log</TabsTrigger>
            <TabsTrigger value="rekap">Rekap Kehadiran</TabsTrigger>
          </TabsList>

          {/* ── REKAP KEHADIRAN TAB ── */}
          <TabsContent value="rekap" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Filter Rekap Kehadiran</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={recapStartDate}
                      onChange={(e) => setRecapStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={recapEndDate}
                      onChange={(e) => setRecapEndDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Cari Member</Label>
                    <Input
                      placeholder="Nama member..."
                      value={recapTempSearch}
                      onChange={(e) => setRecapTempSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyRecap()}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleApplyRecap}>
                    <Search className="w-4 h-4 mr-2" />
                    Terapkan Filter
                  </Button>
                  <Button variant="outline" onClick={handleClearRecap}>
                    Clear
                  </Button>
                  <Button variant="secondary" onClick={handleDownloadRecap}>
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                  </Button>
                </div>
                {(recapAppliedStart || recapAppliedEnd) && (
                  <p className="text-sm text-muted-foreground mt-3">
                    Periode:{" "}
                    {recapAppliedStart ? format(recapAppliedStart, "dd MMM yyyy") : "—"}
                    {" s/d "}
                    {recapAppliedEnd ? format(recapAppliedEnd, "dd MMM yyyy") : "—"}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Total Kehadiran per Member
                  </CardTitle>
                  {recapData && (
                    <span className="text-sm text-muted-foreground">
                      {recapData.totalCount} member ditemukan
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingRecap ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Rank</TableHead>
                            <TableHead>Nama Member</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead className="text-center">Total Kehadiran</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recapData?.items && recapData.items.length > 0 ? (
                            recapData.items.map((item) => (
                              <TableRow key={item.memberId}>
                                <TableCell>
                                  {item.rank <= 3 ? (
                                    <Badge
                                      className={
                                        item.rank === 1
                                          ? "bg-yellow-400 text-yellow-900"
                                          : item.rank === 2
                                          ? "bg-gray-300 text-gray-800"
                                          : "bg-orange-400 text-orange-900"
                                      }
                                    >
                                      #{item.rank}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">#{item.rank}</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {item.memberName ?? "-"}
                                </TableCell>
                                <TableCell>{item.memberEmail ?? "-"}</TableCell>
                                <TableCell>{item.memberPhone ?? "-"}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="text-base font-bold px-3 py-1">
                                    {item.totalCheckins}x
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                Tidak ada data kehadiran untuk filter yang dipilih.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {recapData && recapData.totalCount > recapPageSize && (
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-sm text-muted-foreground">
                          Menampilkan {((recapPage - 1) * recapPageSize) + 1}–
                          {Math.min(recapPage * recapPageSize, recapData.totalCount)} dari{" "}
                          {recapData.totalCount}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={recapPage === 1}
                            onClick={() => setRecapPage((p) => p - 1)}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={recapPage * recapPageSize >= recapData.totalCount}
                            onClick={() => setRecapPage((p) => p + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── DETAIL LOG TAB ── */}
          <TabsContent value="log" className="space-y-6">

        {/* Filters Section */}
        <Card>
          <CardHeader>
            <CardTitle>Filters & Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Facility Filters */}
            <div className="border-t pt-4 mb-4">
              <h3 className="text-sm font-semibold mb-3">Facility Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="loker">Loker</Label>
                    <Select value={lokerSelection} onValueChange={setLokerSelection}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select loker option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Number">Number</SelectItem>
                      </SelectContent>
                    </Select>
                    {lokerSelection === "Number" && (
                      <Input
                        type="number"
                        placeholder="Enter loker number"
                        value={lokerNumber}
                        onChange={(e) => setLokerNumber(e.target.value)}
                        className="mt-2"
                        min="1"
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="handuk">Handuk</Label>
                    <Select value={handukSelection} onValueChange={setHandukSelection}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select handuk option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Besar">Besar</SelectItem>
                        <SelectItem value="Kecil">Kecil</SelectItem>
                        <SelectItem value="Keduanya">Keduanya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-end gap-2">
                <Button onClick={handleApplyFilters} className="w-full">
                  Apply Filters
                </Button>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={clearFilters} variant="outline" className="w-full">
                  Clear
                </Button>
              </div>
            </div>

            {/* Weekly Report Section */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Weekly Report</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex gap-2">
                  <Button onClick={() => handleWeekNavigation('prev')} variant="outline" size="sm">
                    Previous Week
                  </Button>
                  <Button onClick={() => handleWeekNavigation('current')} variant="outline" size="sm">
                    Current Week
                  </Button>
                  <Button onClick={() => handleWeekNavigation('next')} variant="outline" size="sm">
                    Next Week
                  </Button>
                </div>
                <Button onClick={handleWeeklyReport} className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Load Week Report
                </Button>
                <div className="text-sm text-muted-foreground">
                  Week: {format(currentWeekStart, "MMM dd")} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "MMM dd, yyyy")}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Button onClick={handleDownloadReport} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download Report
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Member Attendance Records</CardTitle>
              {data && (
                <div className="text-sm text-muted-foreground">
                  Showing {data.data.length} of {data.totalCount} records
                  (Page {data.currentPage} of {data.totalPages})
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : error ? (
              <div className="text-red-500">Error loading member attendance records.</div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Check-in Time</TableHead>
                        <TableHead>Checkout Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Member ID</TableHead>
                        <TableHead>Member Name</TableHead>
                        <TableHead>User Name</TableHead>
                        <TableHead>Facility Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.data && data.data.length > 0 ? (
                        data.data.map((log: MemberCheckinLog) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              {log.checkin
                                ? typeof log.checkin === "string"
                                  ? format(new Date(log.checkin), "yyyy-MM-dd HH:mm")
                                  : format(log.checkin, "yyyy-MM-dd HH:mm")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {log.checkout
                                ? typeof log.checkout === "string"
                                  ? format(new Date(log.checkout), "yyyy-MM-dd HH:mm")
                                  : format(log.checkout, "yyyy-MM-dd HH:mm")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {log.status}
                            </TableCell>
                            <TableCell>{log.memberId}</TableCell>
                            <TableCell>{log.memberName ?? "-"}</TableCell>
                            <TableCell>{log.userName ?? "-"}</TableCell>
                            <TableCell>{log.facilityDescription ?? "-"}</TableCell>
                            <TableCell className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(log)}
                              >
                                <Pencil className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              {!log.checkout && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={checkoutMutation.isPending}
                                  onClick={async () => {
                                    try {
                                      await checkoutMutation.mutateAsync({
                                        attendanceId: log.id,
                                      });
                                      toast.success("Checked out successfully");
                                      await refetch();
                                    } catch (err: any) {
                                      toast.error("Failed to checkout");
                                    }
                                  }}
                                >
                                  Checkout
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center">
                            No member attendance records found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination Controls */}
                {data && data.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, data.totalCount)} of {data.totalCount} results
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={!data.hasPreviousPage}
                      >
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {/* Show page numbers */}
                        {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                          const pageNum = i + 1;
                          const isCurrentPage = pageNum === currentPage;
                          return (
                            <Button
                              key={pageNum}
                              variant={isCurrentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-10"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                        
                        {data.totalPages > 5 && (
                          <>
                            <span className="px-2">...</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(data.totalPages)}
                              className="w-10"
                            >
                              {data.totalPages}
                            </Button>
                          </>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={!data.hasNextPage}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editingLog} onOpenChange={() => setEditingLog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Member Attendance Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Facility Description</Label>
                <Input
                  value={editFacility}
                  onChange={(e) => setEditFacility(e.target.value)}
                />
              </div>
              <div className="flex gap-2 mt-2">
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  Save
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setEditingLog(null)}
                  type="button"
                >
                  Cancel
                </Button>
              </div>
              {updateMutation.isError && (
                <div className="text-red-500 mt-2">Failed to update record.</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}