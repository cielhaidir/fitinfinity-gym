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
import { format } from "date-fns";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

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
  const { data, isLoading, error, refetch } = api.esp32.getMemberCheckinLogs.useQuery();
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
        // checkin: editCheckin ? new Date(editCheckin).toISOString() : undefined,
        facilityDescription: editFacility,
      });
      toast.success("Check-in log updated");
      setEditingLog(null);
      await refetch();
    } catch (err: any) {
      toast.error("Failed to update log");
    }
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
            {/* <div>
              <Label>Check-in Time</Label>
              <Input
                type="datetime-local"
                value={editCheckin}
                onChange={(e) => setEditCheckin(e.target.value)}
              />
            </div> */}
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