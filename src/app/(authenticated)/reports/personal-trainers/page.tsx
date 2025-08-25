"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/trpc/react";
import { format, subDays } from "date-fns";
import { Clock, Users, Calendar, FileSpreadsheet, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from "xlsx-js-style";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

interface TrainerSummary {
  trainerId: string;
  trainerName: string;
  trainerEmail: string;
  totalHours: number;
  sessionCount: number;
}

interface SessionDetail {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  memberName: string;
  memberEmail: string;
  isGroup: boolean;
  attendanceCount: number;
  hours: number;
  description?: string;
}

interface ReportDataAllTrainers {
  trainers: TrainerSummary[];
  totalConductHours: number;
  totalSessions: number;
}

interface ReportDataSingleTrainer {
  summary: TrainerSummary;
  sessions: SessionDetail[];
}

type ReportData = ReportDataAllTrainers | ReportDataSingleTrainer;

export default function PersonalTrainerReportPage() {
  // Filter form states
  const [tempStartDate, setTempStartDate] = useState<Date>(subDays(new Date(), 30));
  const [tempEndDate, setTempEndDate] = useState<Date>(new Date());
  const [tempSelectedTrainer, setTempSelectedTrainer] = useState<string>("all");
  
  // Applied filter states
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedTrainer, setSelectedTrainer] = useState<string>("all");

  // Fetch PT conduct report
  const { data: reportData, isLoading: isLoadingReport, refetch } = api.trainerSession.getAdminConductReport.useQuery({
    startDate,
    endDate,
    trainerId: selectedTrainer === "all" ? undefined : selectedTrainer,
  });

  // Fetch trainers for dropdown
  const { data: trainers } = api.personalTrainer.listWithUsers.useQuery();

  // Type guard to check if data is for all trainers
  const isAllTrainersData = (data: ReportData): data is ReportDataAllTrainers => {
    return 'trainers' in data;
  };

  // Helper to get display data
  const getDisplayData = () => {
    if (!reportData) return null;

    if (selectedTrainer === "all" && isAllTrainersData(reportData)) {
      // All trainers view
      return {
        summary: reportData.trainers || [],
        sessions: [],
        isAllTrainers: true,
        totalHours: reportData.totalConductHours || 0,
        totalSessions: reportData.totalSessions || 0,
      };
    } else if (selectedTrainer !== "all" && !isAllTrainersData(reportData)) {
      // Single trainer view
      return {
        summary: [reportData.summary],
        sessions: reportData.sessions || [],
        isAllTrainers: false,
        totalHours: reportData.summary.totalHours || 0,
        totalSessions: reportData.summary.sessionCount || 0,
      };
    }

    // Fallback for mismatched data
    return {
      summary: [],
      sessions: [],
      isAllTrainers: selectedTrainer === "all",
      totalHours: 0,
      totalSessions: 0,
    };
  };

  const displayData = getDisplayData();

  // Apply filters handler
  const handleApplyFilters = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setSelectedTrainer(tempSelectedTrainer);
    refetch();
  };

  // Reset filters handler
  const handleResetFilters = () => {
    const defaultStartDate = subDays(new Date(), 30);
    const defaultEndDate = new Date();
    
    setTempStartDate(defaultStartDate);
    setTempEndDate(defaultEndDate);
    setTempSelectedTrainer("all");
    
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setSelectedTrainer("all");
    refetch();
  };

  // Export to Excel
  const exportToExcel = async () => {
    if (!displayData) return;

    const workbook = XLSX.utils.book_new();
    
    // Sheet 1: Summary
    if (displayData.isAllTrainers) {
      const summaryData = displayData.summary.map((item: TrainerSummary) => ({
        "Trainer Name": item.trainerName,
        "Trainer Email": item.trainerEmail,
        "Total Hours": item.totalHours,
        "Total Sessions": item.sessionCount,
      }));
      
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      const summaryCols = Object.keys(summaryData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      summaryWorksheet['!cols'] = summaryCols;
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");
    } else {
      const summaryData = displayData.summary.map((item: TrainerSummary) => ({
        "Trainer Name": item.trainerName,
        "Trainer Email": item.trainerEmail,
        "Total Hours": item.totalHours,
        "Total Sessions": item.sessionCount,
      }));
      
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      const summaryCols = Object.keys(summaryData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      summaryWorksheet['!cols'] = summaryCols;
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");
    }

    // Sheet 2: Session Details (only for single trainer view)
    if (!displayData.isAllTrainers && displayData.sessions.length > 0) {
      const sessionData = displayData.sessions.map((session: SessionDetail) => ({
        "Date": format(new Date(session.date), "yyyy-MM-dd"),
        "Start Time": format(new Date(session.startTime), "HH:mm"),
        "End Time": format(new Date(session.endTime), "HH:mm"),
        "Member Name": session.memberName,
        "Member Email": session.memberEmail,
        "Type": session.isGroup ? "Group" : "Individual",
        "Attendance Count": session.attendanceCount,
        "Duration (Hours)": session.hours,
        "Description": session.description || "",
      }));
      
      const sessionWorksheet = XLSX.utils.json_to_sheet(sessionData);
      const sessionCols = Object.keys(sessionData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      sessionWorksheet['!cols'] = sessionCols;
      XLSX.utils.book_append_sheet(workbook, sessionWorksheet, "Session Details");
    }

    // Sheet 3: Report Info
    const reportInfo = [
      { "Metric": "Report Period", "Value": `${format(startDate, "PPP")} - ${format(endDate, "PPP")}` },
      { "Metric": "Generated At", "Value": format(new Date(), "PPP p") },
      { "Metric": "Selected Trainer", "Value": selectedTrainer === "all" ? "All Trainers" : trainers?.find(t => t.id === selectedTrainer)?.user.name || "Unknown" },
      { "Metric": "Total Trainers", "Value": displayData.summary.length.toString() },
      { "Metric": "Total Sessions", "Value": displayData.totalSessions.toString() },
    ];

    const infoWorksheet = XLSX.utils.json_to_sheet(reportInfo);
    const infoCols = Object.keys(reportInfo[0] || {}).map(key => ({
      wch: Math.max(key.length, 20)
    }));
    infoWorksheet['!cols'] = infoCols;
    XLSX.utils.book_append_sheet(workbook, infoWorksheet, "Report Info");

    // Generate and download file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `pt-conduct-report-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.xlsx`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  if (isLoadingReport || !displayData) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Personal Trainer Conduct Report</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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
          <h1 className="text-3xl font-bold">Personal Trainer Conduct Report</h1>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conduct Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayData.totalHours.toFixed(1)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayData.totalSessions}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trainers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayData.summary.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">View Mode</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {displayData.isAllTrainers ? "All Trainers" : "Single Trainer"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {displayData.isAllTrainers ? "All Trainers Summary" : "Trainer Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Trainer Name</th>
                    <th className="text-left py-2">Email</th>
                    <th className="text-right py-2">Total Hours</th>
                    <th className="text-right py-2">Total Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.summary.map((item: TrainerSummary) => (
                    <tr key={item.trainerId} className="border-b hover:bg-infinity">
                      <td className="py-2 font-medium">{item.trainerName}</td>
                      <td className="py-2 text-sm text-gray-600">{item.trainerEmail}</td>
                      <td className="text-right py-2">{item.totalHours.toFixed(1)}</td>
                      <td className="text-right py-2">{item.sessionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Session Details - Only show for single trainer view */}
        {!displayData.isAllTrainers && displayData.sessions.length > 0 && (
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
                      <th className="text-left py-2">Time</th>
                      <th className="text-left py-2">Member</th>
                      <th className="text-left py-2">Type</th>
                      <th className="text-right py-2">Duration</th>
                      <th className="text-left py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.sessions.map((session: SessionDetail) => (
                      <tr key={session.id} className="border-b hover:bg-infinity">
                        <td className="py-2">{format(new Date(session.date), "MMM d, yyyy")}</td>
                        <td className="py-2">
                          {format(new Date(session.startTime), "HH:mm")} - {format(new Date(session.endTime), "HH:mm")}
                        </td>
                        <td className="py-2">
                          <div className="font-medium">{session.memberName}</div>
                          <div className="text-sm text-gray-600">{session.memberEmail}</div>
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            session.isGroup
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {session.isGroup ? "Group" : "Individual"}
                          </span>
                        </td>
                        <td className="text-right py-2">{session.hours}h</td>
                        {/* <td className="py-2 text-sm text-gray-600">{session.description || "-"}</td> */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}