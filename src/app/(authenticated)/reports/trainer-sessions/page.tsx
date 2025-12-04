"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/app/_components/ui/combobox";
import { api } from "@/trpc/react";
import { format, subDays } from "date-fns";
import { Clock, Calendar, FileSpreadsheet, Filter, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from "xlsx-js-style";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

interface SessionDetail {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  durationHours: number;
  trainerName: string;
  trainerEmail: string;
  trainerId: string;
  memberName: string | null;
  memberEmail: string | null;
  memberId: string;
  isGroup: boolean;
  attendanceCount: number;
  description?: string | null;
  status?: string | null;
}

export default function TrainerSessionsReportPage() {
  // Filter form states (temp)
  const [tempStartDate, setTempStartDate] = useState<Date>(subDays(new Date(), 30));
  const [tempEndDate, setTempEndDate] = useState<Date>(new Date());
  const [tempSelectedTrainer, setTempSelectedTrainer] = useState<string>("all");
  const [tempSelectedMember, setTempSelectedMember] = useState<string>("all");
  
  // Applied filter states
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedTrainer, setSelectedTrainer] = useState<string>("all");
  const [selectedMember, setSelectedMember] = useState<string>("all");

  // Fetch trainer sessions report
  const { data: reportData, isLoading: isLoadingReport, refetch } = api.trainerSession.getTrainerSessionsReport.useQuery({
    startDate,
    endDate,
    trainerId: selectedTrainer === "all" ? undefined : selectedTrainer,
    memberId: selectedMember === "all" ? undefined : selectedMember,
  });

  // Fetch trainers for dropdown
  const { data: trainers } = api.personalTrainer.listWithUsers.useQuery();

  // Fetch members by trainer for dropdown (only when trainer is selected)
  const { data: membersByTrainer, isLoading: isLoadingMembers } = api.trainerSession.getMembersByTrainer.useQuery(
    { trainerId: tempSelectedTrainer },
    { enabled: tempSelectedTrainer !== "all" && tempSelectedTrainer !== "" }
  );

  // Convert members to combobox options
  const memberOptions: ComboboxOption[] = membersByTrainer?.map((member) => ({
    value: member.id,
    label: member.name || member.email || "Unknown",
  })) ?? [];

  // Clear member selection when trainer changes
  useEffect(() => {
    if (tempSelectedTrainer === "all" || tempSelectedTrainer === "") {
      setTempSelectedMember("all");
    } else {
      // Reset member selection when trainer changes
      setTempSelectedMember("all");
    }
  }, [tempSelectedTrainer]);

  // Apply filters handler
  const handleApplyFilters = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setSelectedTrainer(tempSelectedTrainer);
    setSelectedMember(tempSelectedMember);
    refetch();
  };

  // Reset filters handler
  const handleResetFilters = () => {
    const defaultStartDate = subDays(new Date(), 30);
    const defaultEndDate = new Date();
    
    setTempStartDate(defaultStartDate);
    setTempEndDate(defaultEndDate);
    setTempSelectedTrainer("all");
    setTempSelectedMember("all");
    
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setSelectedTrainer("all");
    setSelectedMember("all");
    refetch();
  };

  // Export to Excel
  const exportToExcel = async () => {
    if (!reportData) return;

    const workbook = XLSX.utils.book_new();
    
    // Sheet 1: Session Details
    const sessionData = reportData.sessions.map((session: SessionDetail) => ({
      "Date": format(new Date(session.date), "yyyy-MM-dd"),
      "Trainer Name": session.trainerName,
      "Member Name": session.memberName || "N/A",
      "Start Time": format(new Date(session.startTime), "HH:mm"),
      "End Time": format(new Date(session.endTime), "HH:mm"),
      "Duration (Hours)": session.durationHours.toFixed(2),
      "Session Type": session.isGroup ? "Group" : "Individual",
      "Attendance Count": session.attendanceCount,
      "Status": session.status || "N/A",
      "Description": session.description || "",
    }));
    
    const sessionWorksheet = XLSX.utils.json_to_sheet(sessionData);
    const sessionCols = Object.keys(sessionData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    sessionWorksheet['!cols'] = sessionCols;
    XLSX.utils.book_append_sheet(workbook, sessionWorksheet, "Sessions");

    // Sheet 2: Report Info
    const reportInfo = [
      { "Metric": "Report Period", "Value": `${format(startDate, "PPP")} - ${format(endDate, "PPP")}` },
      { "Metric": "Generated At", "Value": format(new Date(), "PPP p") },
      { "Metric": "Selected Trainer", "Value": selectedTrainer === "all" ? "All Trainers" : trainers?.find(t => t.id === selectedTrainer)?.user.name || "Unknown" },
      { "Metric": "Selected Member", "Value": selectedMember === "all" ? "All Members" : membersByTrainer?.find(m => m.id === selectedMember)?.name || "Unknown" },
      { "Metric": "Total Sessions", "Value": reportData.totalSessions.toString() },
      { "Metric": "Total Hours", "Value": reportData.totalHours.toFixed(2) },
    ];

    const infoWorksheet = XLSX.utils.json_to_sheet(reportInfo);
    const infoCols = Object.keys(reportInfo[0] || {}).map(key => ({
      wch: Math.max(key.length, 25)
    }));
    infoWorksheet['!cols'] = infoCols;
    XLSX.utils.book_append_sheet(workbook, infoWorksheet, "Report Info");

    // Generate and download file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `trainer-sessions-report-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.xlsx`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  if (isLoadingReport) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Trainer Sessions Report</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermissions={["report:pt"]}>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Trainer Sessions Report</h1>
          <Button onClick={exportToExcel} variant="outline" className="bg-green-600 hover:bg-green-700 text-white">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={format(tempStartDate, "yyyy-MM-dd")}
                    onChange={(e) => setTempStartDate(new Date(e.target.value))}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={format(tempEndDate, "yyyy-MM-dd")}
                    onChange={(e) => setTempEndDate(new Date(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Personal Trainer</Label>
                  <Select value={tempSelectedTrainer} onValueChange={setTempSelectedTrainer}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Trainers</SelectItem>
                      {trainers?.map((trainer) => (
                        <SelectItem key={trainer.id} value={trainer.id}>
                          {trainer.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Member</Label>
                  {tempSelectedTrainer === "all" || tempSelectedTrainer === "" ? (
                    <Button
                      variant="outline"
                      className="w-full justify-start font-normal text-muted-foreground"
                      disabled
                    >
                      Select trainer first
                    </Button>
                  ) : (
                    <Combobox
                      options={[
                        { value: "all", label: "All Members" },
                        ...memberOptions,
                      ]}
                      value={tempSelectedMember}
                      onValueChange={setTempSelectedMember}
                      placeholder={isLoadingMembers ? "Loading..." : "Select member"}
                      emptyText="No members found for this trainer."
                      disabled={isLoadingMembers}
                    />
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                >
                  Reset
                </Button>
                <Button
                  onClick={handleApplyFilters}
                  disabled={isLoadingReport}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reportData?.totalSessions || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(reportData?.totalHours || 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Hours/Session</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reportData?.totalSessions && reportData.totalSessions > 0
                  ? (reportData.totalHours / reportData.totalSessions).toFixed(2)
                  : "0.00"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Trainer</th>
                    <th className="text-left py-2">Member</th>
                    <th className="text-left py-2">Time</th>
                    <th className="text-right py-2">Duration</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData?.sessions && reportData.sessions.length > 0 ? (
                    reportData.sessions.map((session: SessionDetail) => (
                      <tr key={session.id} className="border-b hover:bg-muted/50">
                        <td className="py-2">{format(new Date(session.date), "MMM d, yyyy")}</td>
                        <td className="py-2">
                          <div className="font-medium">{session.trainerName}</div>
                          <div className="text-sm text-muted-foreground">{session.trainerEmail}</div>
                        </td>
                        <td className="py-2">
                          <div className="font-medium">{session.memberName}</div>
                          <div className="text-sm text-muted-foreground">{session.memberEmail}</div>
                        </td>
                        <td className="py-2">
                          {format(new Date(session.startTime), "HH:mm")} - {format(new Date(session.endTime), "HH:mm")}
                        </td>
                        <td className="text-right py-2">{session.durationHours.toFixed(2)}h</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            session.isGroup
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                          }`}>
                            {session.isGroup ? `Group (${session.attendanceCount})` : "Individual"}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            session.status === "ENDED"
                              ? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
                              : session.status === "ONGOING"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                              : session.status === "CANCELED"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                          }`}>
                            {session.status || "NOT_YET"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No sessions found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div className="flex gap-8">
                <div>
                  <span className="text-sm text-muted-foreground">Total Sessions: </span>
                  <span className="font-bold text-lg">{reportData?.totalSessions || 0}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Total Hours: </span>
                  <span className="font-bold text-lg">{(reportData?.totalHours || 0).toFixed(2)}</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Report Period: {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}