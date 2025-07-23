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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from "date-fns";
import { toast } from "sonner";
import { Pencil, Download, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function CheckinLogsPage() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const { data, isLoading, error, refetch } = api.esp32.getMemberCheckinLogs.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
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
  };

  const handleDownloadReport = () => {
    if (!data || data.length === 0) {
      toast.error("No data to download");
      return;
    }

    const headers = ["Check-in Time", "Checkout Time", "Status", "Member ID", "Member Name", "User Name", "Facility Description"];
    const csvContent = [
      headers.join(","),
      ...data.map((log: MemberCheckinLog) => [
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
    link.setAttribute("download", `checkin-report-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Member Check-in Logs</h1>
          <p className="text-muted-foreground">
            View and manage all member check-in records
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
            <div className="flex items-end gap-2">
              <Button onClick={() => refetch()} className="w-full">
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
          <CardTitle>Check-in Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="text-red-500">Error loading check-in logs.</div>
          ) : (
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
                  {data && data.length > 0 ? (
                    data.map((log: MemberCheckinLog) => (
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
                        No check-in logs found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingLog} onOpenChange={() => setEditingLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Check-in Log</DialogTitle>
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
              <div className="text-red-500 mt-2">Failed to update log.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}