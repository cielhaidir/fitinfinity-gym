"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import type { Class } from "@/app/(authenticated)/member/classes/types";

interface AdminClassRegisterDialogProps {
  class_: Class | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminClassRegisterDialog({
  class_,
  open,
  onOpenChange,
}: AdminClassRegisterDialogProps) {

  const utils = api.useUtils();
  const removeMutation = api.memberClass.adminRemoveMember.useMutation();

  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  
  const { data: members, isLoading: membersLoading } = api.member.getAll.useQuery();
  const addMutation = api.memberClass.adminAddMember.useMutation();
  
  if (!class_) return null;
  


 
  const handleRemove = async (classId: string,memberId: string) => {
    try {
      await removeMutation.mutateAsync({ classId, memberId });
      toast.success("Member removed from class");
      await utils.memberClass.list.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove member");
    }
  };
  
  const handleRegister = async () => {
    if (!selectedMemberId) return;
    try {
      await addMutation.mutateAsync({ classId: class_.id, memberId: selectedMemberId });
      toast.success("Member registered to class successfully");
      await utils.memberClass.list.invalidate();
      setSelectedMemberId("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to register member");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{class_.name}</DialogTitle>
          <DialogDescription>with {class_.instructorName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mb-4">
          <p>
            <strong>Schedule:</strong>{" "}
            {new Date(class_.schedule).toLocaleString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p>
            <strong>Duration:</strong> {class_.duration} minutes
          </p>
          <p>
            <strong>Capacity:</strong> {class_.limit ?? "Unlimited"}
          </p>
        </div>
        <hr/>
        <div className="">
          <div>
            <strong>Registered Members ({class_.registeredMembers?.length ?? 0}):</strong>
            <ul className="list-disc ml-5 mt-1 mb-3">
              {class_.registeredMembers?.length
                ? class_.registeredMembers.map((member) => (
                    <li key={member.id}>
                      {member.member.user.name || member.member.user.email || member.member.id}
                        <span
                        className="ml-2 inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs cursor-pointer hover:bg-red-200 transition"
                        onClick={() => handleRemove(class_.id, member.memberId)}
                        style={{ opacity: removeMutation.isPending ? 0.5 : 1, pointerEvents: removeMutation.isPending ? "none" : "auto" }}
                        >
                        Remove
                        </span>
                    </li>
                  ))
                : <li className="text-gray-400">No registered members</li>}
            </ul>

          </div>
          <div>
            <strong>Waiting List ({class_.waitingList?.length ?? 0}):</strong>
            <ul className="list-disc ml-5 mt-1">
              {class_.waitingList?.length
                ? class_.waitingList.map((member) => (
                    <li key={member.id}>
                      {member.member.user.name || member.member.user.email || member.member.id}
                    </li>
                  ))
                : <li className="text-gray-400">No waiting list</li>}
            </ul>
          </div>
        </div>
        <hr></hr>
        <div>
          <label className="block mb-1 font-medium">Select Member</label>
          <Select value={selectedMemberId} onValueChange={setSelectedMemberId} disabled={membersLoading}>
            <SelectTrigger>
              <SelectValue placeholder={membersLoading ? "Loading..." : "Select a member"} />
            </SelectTrigger>
            <SelectContent>
              {members?.map((member: any) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.user?.name || member.user?.email || member.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            className="w-full bg-infinity"
            onClick={handleRegister}
            disabled={!selectedMemberId || addMutation.isPending}
          >
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

