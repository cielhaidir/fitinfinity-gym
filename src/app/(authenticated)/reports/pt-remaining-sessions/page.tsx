"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/trpc/react";
import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import { 
  FileSpreadsheet, 
  Filter, 
  Search, 
  X, 
  Eye, 
  ChevronDown, 
  ChevronRight,
  Users,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  Phone,
  ChevronsDown,
  ChevronsUp
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from "xlsx-js-style";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface MemberWithSessions {
  membershipId: string;
  user: {
    id: string;
    name: string | null;
    phone: string | null;
  };
  subscriptionId: string;
  package: {
    id: string;
    name: string;
    sessions: number | null;
  };
  remainingSessions: number | null;
  startDate: Date;
  endDate: Date | null;
}

interface TrainerData {
  trainerId: string;
  trainerUser: {
    id: string;
    name: string | null;
    phone: string | null;
  };
  totalMembersWithRemaining: number;
  members: MemberWithSessions[];
}

type ViewMode = "grouped" | "flat";
type StatusFilter = "all" | "active" | "ending-soon" | "expired";

export default function PTRemainingSessionsReportPage() {
  const { toast } = useToast();

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");

  // Filter states
  const [search, setSearch] = useState<string>("");
  const [trainerId, setTrainerId] = useState<string>("all");
  const [minRemaining, setMinRemaining] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  // Expanded trainers (for grouped view)
  const [expandedTrainers, setExpandedTrainers] = useState<Set<string>>(new Set());

  // Sorting states (for flat view)
  const [sortBy, setSortBy] = useState<"name" | "remaining" | "startDate">("remaining");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Fetch PT remaining sessions report
  const {
    data: reportData,
    isLoading: isLoadingReport,
    refetch,
  } = api.reports.ptRemainingSessions.list.useQuery({
    trainerId: trainerId === "all" ? undefined : trainerId,
    minRemaining: minRemaining ? parseInt(minRemaining) : undefined,
    search: search || undefined,
    groupByTrainer: viewMode === "grouped",
    page,
    pageSize,
  });

  // Fetch all trainers for filter dropdown
  const { data: trainersData } = api.trainer.list.useQuery({});

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!reportData?.items) return null;

    let totalTrainers = 0;
    let totalMembers = 0;
    let totalRemaining = 0;

    if (viewMode === "grouped") {
      reportData.items.forEach((trainer: TrainerData) => {
        totalTrainers += 1;
        totalMembers += trainer.members.length;
        totalRemaining += trainer.members.reduce(
          (sum, m) => sum + (m.remainingSessions || 0),
          0
        );
      });
    } else {
      const trainerIds = new Set<string>();
      reportData.items.forEach((item: TrainerData) => {
        trainerIds.add(item.trainerId);
        item.members.forEach((member) => {
          totalMembers += 1;
          totalRemaining += member.remainingSessions || 0;
        });
      });
      totalTrainers = trainerIds.size;
    }

    return {
      totalTrainers,
      totalMembers,
      totalRemaining,
      averagePerMember: totalMembers > 0 ? (totalRemaining / totalMembers).toFixed(1) : "0",
    };
  }, [reportData, viewMode]);

  // Determine member status
  const getMemberStatus = (member: MemberWithSessions): "active" | "ending-soon" | "expired" => {
    const remaining = member.remainingSessions || 0;
    const today = new Date();
    
    if (member.endDate && isBefore(new Date(member.endDate), today)) {
      return "expired";
    }
    
    if (remaining === 0) {
      return "expired";
    }
    
    if (remaining <= 5) {
      return "ending-soon";
    }
    
    return "active";
  };

  // Filter members by status in grouped view
  const getFilteredMembers = (members: MemberWithSessions[]) => {
    if (statusFilter === "all") return members;
    
    return members.filter((member) => {
      const status = getMemberStatus(member);
      return status === statusFilter;
    });
  };

  // Apply sorting to flat view
  const getSortedMembers = (members: MemberWithSessions[]) => {
    const sorted = [...members];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "name") {
        const nameA = a.user.name || "";
        const nameB = b.user.name || "";
        comparison = nameA.localeCompare(nameB);
      } else if (sortBy === "remaining") {
        comparison = (a.remainingSessions || 0) - (b.remainingSessions || 0);
      } else if (sortBy === "startDate") {
        comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      }
      
      return sortDir === "asc" ? comparison : -comparison;
    });
    
    return sorted;
  };

  // Handle sorting
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
  };

  // Toggle trainer expansion
  const toggleTrainer = (trainerId: string) => {
    const newExpanded = new Set(expandedTrainers);
    if (newExpanded.has(trainerId)) {
      newExpanded.delete(trainerId);
    } else {
      newExpanded.add(trainerId);
    }
    setExpandedTrainers(newExpanded);
  };

  // Expand/Collapse all trainers
  const expandAllTrainers = () => {
    if (!reportData?.items) return;
    const allTrainerIds = new Set(reportData.items.map((t: TrainerData) => t.trainerId));
    setExpandedTrainers(allTrainerIds);
  };

  const collapseAllTrainers = () => {
    setExpandedTrainers(new Set());
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearch("");
    setTrainerId("all");
    setMinRemaining("");
    setStatusFilter("all");
    setPage(1);
    refetch();
  };

  // Export to Excel
  const exportToExcel = async () => {
    if (!reportData || reportData.items.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Sheet 1: Summary by Trainer
    const trainerSummaryData: any[] = [];
    
    if (viewMode === "grouped") {
      reportData.items.forEach((trainer: TrainerData) => {
        const totalRemaining = trainer.members.reduce(
          (sum, m) => sum + (m.remainingSessions || 0),
          0
        );
        trainerSummaryData.push({
          "Trainer Name": trainer.trainerUser.name || "N/A",
          "Trainer Phone": trainer.trainerUser.phone || "N/A",
          "Total Members": trainer.members.length,
          "Total Remaining Sessions": totalRemaining,
          "Average per Member": trainer.members.length > 0
            ? (totalRemaining / trainer.members.length).toFixed(1)
            : "0",
        });
      });
    } else {
      const trainerMap = new Map<string, { name: string; phone: string; members: number; sessions: number }>();
      reportData.items.forEach((item: TrainerData) => {
        if (!trainerMap.has(item.trainerId)) {
          trainerMap.set(item.trainerId, {
            name: item.trainerUser.name || "N/A",
            phone: item.trainerUser.phone || "N/A",
            members: 0,
            sessions: 0,
          });
        }
        const data = trainerMap.get(item.trainerId)!;
        item.members.forEach((member) => {
          data.members += 1;
          data.sessions += member.remainingSessions || 0;
        });
      });
      
      trainerMap.forEach((data, trainerId) => {
        trainerSummaryData.push({
          "Trainer Name": data.name,
          "Trainer Phone": data.phone,
          "Total Members": data.members,
          "Total Remaining Sessions": data.sessions,
          "Average per Member": data.members > 0 ? (data.sessions / data.members).toFixed(1) : "0",
        });
      });
    }

    const summaryWorksheet = XLSX.utils.json_to_sheet(trainerSummaryData);
    const summaryCols = Object.keys(trainerSummaryData[0] || {}).map((key) => ({
      wch: Math.max(key.length, 20),
    }));
    summaryWorksheet["!cols"] = summaryCols;
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary by Trainer");

    // Sheet 2: Detailed Member List
    const memberDetailData: any[] = [];
    
    reportData.items.forEach((trainer: TrainerData) => {
      trainer.members.forEach((member) => {
        const status = getMemberStatus(member);
        const daysUntilExpiry = member.endDate
          ? differenceInDays(new Date(member.endDate), new Date())
          : null;
        
        memberDetailData.push({
          "Trainer Name": trainer.trainerUser.name || "N/A",
          "Trainer Phone": trainer.trainerUser.phone || "N/A",
          "Member Name": member.user.name || "N/A",
          "Member Phone": member.user.phone || "N/A",
          "Package": member.package.name,
          "Package Sessions": member.package.sessions || "N/A",
          "Remaining Sessions": member.remainingSessions || 0,
          "Start Date": format(new Date(member.startDate), "yyyy-MM-dd"),
          "End Date": member.endDate
            ? format(new Date(member.endDate), "yyyy-MM-dd")
            : "No Expiry",
          "Days Until Expiry": daysUntilExpiry !== null
            ? daysUntilExpiry > 0
              ? daysUntilExpiry.toString()
              : "Expired"
            : "N/A",
          "Status": status === "active"
            ? "Active"
            : status === "ending-soon"
              ? "Ending Soon"
              : "Expired",
        });
      });
    });

    const memberWorksheet = XLSX.utils.json_to_sheet(memberDetailData);
    const memberCols = Object.keys(memberDetailData[0] || {}).map((key) => ({
      wch: Math.max(key.length, 15),
    }));
    memberWorksheet["!cols"] = memberCols;
    XLSX.utils.book_append_sheet(workbook, memberWorksheet, "Member Details");

    // Sheet 3: Report Info
    const reportInfo = [
      { Metric: "Report Type", Value: "PT Remaining Sessions Report" },
      { Metric: "Generated At", Value: format(new Date(), "PPP p") },
      { Metric: "View Mode", Value: viewMode === "grouped" ? "Grouped by Trainer" : "Flat List" },
      { Metric: "Trainer Filter", Value: trainerId === "all" ? "All Trainers" : "Specific Trainer" },
      { Metric: "Minimum Remaining Filter", Value: minRemaining || "None" },
      { Metric: "Status Filter", Value: statusFilter },
      { Metric: "Search Query", Value: search || "None" },
      { Metric: "Total Trainers", Value: summaryStats?.totalTrainers.toString() || "0" },
      { Metric: "Total Members", Value: summaryStats?.totalMembers.toString() || "0" },
      { Metric: "Total Remaining Sessions", Value: summaryStats?.totalRemaining.toString() || "0" },
      { Metric: "Average per Member", Value: summaryStats?.averagePerMember || "0" },
    ];

    const infoWorksheet = XLSX.utils.json_to_sheet(reportInfo);
    const infoCols = Object.keys(reportInfo[0] || {}).map((key) => ({
      wch: Math.max(key.length, 30),
    }));
    infoWorksheet["!cols"] = infoCols;
    XLSX.utils.book_append_sheet(workbook, infoWorksheet, "Report Info");

    // Generate and download file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `pt-remaining-sessions-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    link.click();

    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Report has been exported to Excel",
    });
  };

  // Pagination helpers
  const totalPages = reportData ? Math.ceil(reportData.totalCount / pageSize) : 0;

  if (isLoadingReport && page === 1) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">PT Remaining Sessions Report</h1>
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
    <ProtectedRoute requiredPermissions={["report:pt-remaining-sessions"]}>
      <div className="container mx-auto py-10 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">PT Remaining Sessions Report</h1>
            <p className="text-muted-foreground mt-1">
              Track members' remaining training sessions by personal trainer
            </p>
          </div>
          <Button
            onClick={exportToExcel}
            variant="outline"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={!reportData || reportData.items.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* Summary Cards */}
        {summaryStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Trainers</p>
                    <p className="text-2xl font-bold">{summaryStats.totalTrainers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <ClipboardList className="h-6 w-6 text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Members</p>
                    <p className="text-2xl font-bold">{summaryStats.totalMembers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sessions</p>
                    <p className="text-2xl font-bold">{summaryStats.totalRemaining}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg per Member</p>
                    <p className="text-2xl font-bold">{summaryStats.averagePerMember}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter PT sessions by various criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Member name, phone..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label>Trainer</Label>
                  <Select value={trainerId} onValueChange={setTrainerId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Trainers</SelectItem>
                      {trainersData?.trainers.map((trainer) => (
                        <SelectItem key={trainer.id} value={trainer.id}>
                          {trainer.user?.name || "Unknown"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Min. Remaining</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 5"
                    value={minRemaining}
                    onChange={(e) => setMinRemaining(e.target.value)}
                    min="0"
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="ending-soon">Ending Soon (≤5)</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>View Mode</Label>
                  <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grouped">Grouped by Trainer</SelectItem>
                      <SelectItem value="flat">Flat List</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleResetFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
                <Button onClick={() => refetch()} disabled={isLoadingReport}>
                  <Filter className="mr-2 h-4 w-4" />
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Display */}
        {viewMode === "grouped" ? (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  Trainers & Members
                  {reportData && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({reportData.items.length} trainers)
                    </span>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={expandAllTrainers}>
                    <ChevronsDown className="mr-2 h-4 w-4" />
                    Expand All
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAllTrainers}>
                    <ChevronsUp className="mr-2 h-4 w-4" />
                    Collapse All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingReport ? (
                  <Skeleton className="h-64 w-full" />
                ) : reportData?.items && reportData.items.length > 0 ? (
                  reportData.items.map((trainer: TrainerData) => {
                    const filteredMembers = getFilteredMembers(trainer.members);
                    const totalRemaining = filteredMembers.reduce(
                      (sum, m) => sum + (m.remainingSessions || 0),
                      0
                    );
                    const isExpanded = expandedTrainers.has(trainer.trainerId);

                    if (filteredMembers.length === 0) return null;

                    return (
                      <Collapsible
                        key={trainer.trainerId}
                        open={isExpanded}
                        onOpenChange={() => toggleTrainer(trainer.trainerId)}
                      >
                        <Card>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 md:gap-4">
                                  <div>
                                    {isExpanded ? (
                                      <ChevronDown className="h-5 w-5" />
                                    ) : (
                                      <ChevronRight className="h-5 w-5" />
                                    )}
                                  </div>
                                  <Avatar className="hidden md:block h-12 w-12">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${trainer.trainerUser.name}`} />
                                    <AvatarFallback>
                                      {trainer.trainerUser.name?.charAt(0) || "T"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h3 className="font-semibold text-base md:text-lg">
                                      {trainer.trainerUser.name || "Unknown Trainer"}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                                      <Phone className="h-3 w-3" />
                                      {trainer.trainerUser.phone || "No phone"}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 md:gap-6">
                                  <div className="text-center">
                                    <p className="text-xl md:text-2xl font-bold">{filteredMembers.length}</p>
                                    <p className="text-xs text-muted-foreground">Members</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xl md:text-2xl font-bold text-blue-600">{totalRemaining}</p>
                                    <p className="text-xs text-muted-foreground">Sessions</p>
                                  </div>
                              
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <CardContent>
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left py-3 px-2">Member Name</th>
                                      <th className="text-left py-3 px-2">Phone</th>
                                      <th className="text-left py-3 px-2">Package</th>
                                      <th className="text-center py-3 px-2">Pkg Sessions</th>
                                      <th className="text-center py-3 px-2">Remaining</th>
                                      <th className="text-left py-3 px-2">Start Date</th>
                                      <th className="text-left py-3 px-2">End Date</th>
                                      <th className="text-center py-3 px-2">Status</th>
                                      <th className="text-center py-3 px-2">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filteredMembers.map((member) => {
                                      const status = getMemberStatus(member);
                                      const remaining = member.remainingSessions || 0;

                                      return (
                                        <tr key={member.subscriptionId} className="border-b hover:bg-muted/50">
                                          <td className="py-3 px-2">
                                            <div className="font-medium">{member.user.name || "N/A"}</div>
                                          </td>
                                          <td className="py-3 px-2">
                                            <div className="text-sm">{member.user.phone || "N/A"}</div>
                                          </td>
                                          <td className="py-3 px-2">
                                            <div className="font-medium">{member.package.name}</div>
                                          </td>
                                          <td className="text-center py-3 px-2">
                                            {member.package.sessions || "N/A"}
                                          </td>
                                          <td className="text-center py-3 px-2">
                                            <div className="flex items-center justify-center gap-1">
                                              {remaining <= 5 && remaining > 0 && (
                                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                              )}
                                              <span
                                                className={
                                                  remaining <= 5 && remaining > 0
                                                    ? "font-bold text-orange-600"
                                                    : remaining === 0
                                                      ? "font-bold text-red-600"
                                                      : "font-medium"
                                                }
                                              >
                                                {remaining}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-3 px-2">
                                            {format(new Date(member.startDate), "MMM dd, yyyy")}
                                          </td>
                                          <td className="py-3 px-2">
                                            {member.endDate
                                              ? format(new Date(member.endDate), "MMM dd, yyyy")
                                              : <Badge variant="outline">Active</Badge>}
                                          </td>
                                          <td className="text-center py-3 px-2">
                                            <Badge
                                              variant={
                                                status === "active"
                                                  ? "default"
                                                  : status === "ending-soon"
                                                    ? "secondary"
                                                    : "destructive"
                                              }
                                            >
                                              {status === "active"
                                                ? "Active"
                                                : status === "ending-soon"
                                                  ? "Ending Soon"
                                                  : "Expired"}
                                            </Badge>
                                          </td>
                                          <td className="text-center py-3 px-2">
                                            <Link href={`/member/${member.membershipId}`}>
                                              <Button variant="ghost" size="sm">
                                                <Eye className="h-4 w-4" />
                                              </Button>
                                            </Link>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              {filteredMembers.some((m) => (m.remainingSessions || 0) <= 5) && (
                                <Alert className="mt-4">
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription>
                                    Some members have 5 or fewer sessions remaining. Consider contacting them for renewal.
                                  </AlertDescription>
                                </Alert>
                              )}
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    No members with remaining sessions found for the selected filters.
                  </div>
                )}
              </div>

              {/* Pagination for Grouped View */}
              {reportData && reportData.totalCount > pageSize && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} to{" "}
                    {Math.min(page * pageSize, reportData.totalCount)} of{" "}
                    {reportData.totalCount} trainers
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1 || isLoadingReport}
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
                            disabled={isLoadingReport}
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
                      disabled={page === totalPages || isLoadingReport}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                All Members
                {reportData && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({summaryStats?.totalMembers || 0} members)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Trainer</th>
                      <th
                        className="text-left py-3 px-2 cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center gap-2">
                          Member Name
                          {sortBy === "name" && (
                            <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
                          )}
                        </div>
                      </th>
                      <th className="text-left py-3 px-2">Phone</th>
                      <th className="text-left py-3 px-2">Package</th>
                      <th className="text-center py-3 px-2">Pkg Sessions</th>
                      <th
                        className="text-center py-3 px-2 cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("remaining")}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Remaining
                          {sortBy === "remaining" && (
                            <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="text-left py-3 px-2 cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("startDate")}
                      >
                        <div className="flex items-center gap-2">
                          Start Date
                          {sortBy === "startDate" && (
                            <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
                          )}
                        </div>
                      </th>
                      <th className="text-left py-3 px-2">End Date</th>
                      <th className="text-center py-3 px-2">Status</th>
                      <th className="text-center py-3 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingReport ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center">
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ) : reportData?.items && reportData.items.length > 0 ? (
                      reportData.items.flatMap((trainer: TrainerData) =>
                        getSortedMembers(getFilteredMembers(trainer.members)).map((member) => {
                          const status = getMemberStatus(member);
                          const remaining = member.remainingSessions || 0;

                          return (
                            <tr key={member.subscriptionId} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-2">
                                <div className="font-medium">{trainer.trainerUser.name || "N/A"}</div>
                              </td>
                              <td className="py-3 px-2">
                                <div className="font-medium">{member.user.name || "N/A"}</div>
                              </td>
                              <td className="py-3 px-2">
                                <div className="text-sm">{member.user.phone || "N/A"}</div>
                              </td>
                              <td className="py-3 px-2">
                                <div className="font-medium">{member.package.name}</div>
                              </td>
                              <td className="text-center py-3 px-2">
                                {member.package.sessions || "N/A"}
                              </td>
                              <td className="text-center py-3 px-2">
                                <div className="flex items-center justify-center gap-1">
                                  {remaining <= 5 && remaining > 0 && (
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                  )}
                                  <span
                                    className={
                                      remaining <= 5 && remaining > 0
                                        ? "font-bold text-orange-600"
                                        : remaining === 0
                                          ? "font-bold text-red-600"
                                          : "font-medium"
                                    }
                                  >
                                    {remaining}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-2">
                                {format(new Date(member.startDate), "MMM dd, yyyy")}
                              </td>
                              <td className="py-3 px-2">
                                {member.endDate
                                  ? format(new Date(member.endDate), "MMM dd, yyyy")
                                  : <Badge variant="outline">Active</Badge>}
                              </td>
                              <td className="text-center py-3 px-2">
                                <Badge
                                  variant={
                                    status === "active"
                                      ? "default"
                                      : status === "ending-soon"
                                        ? "secondary"
                                        : "destructive"
                                  }
                                >
                                  {status === "active"
                                    ? "Active"
                                    : status === "ending-soon"
                                      ? "Ending Soon"
                                      : "Expired"}
                                </Badge>
                              </td>
                              <td className="text-center py-3 px-2">
                                <Link href={`/member/${member.membershipId}`}>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )
                    ) : (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-muted-foreground">
                          No members with remaining sessions found for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination for Flat View */}
              {reportData && reportData.totalCount > pageSize && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1 || isLoadingReport}
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
                            disabled={isLoadingReport}
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
                      disabled={page === totalPages || isLoadingReport}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}