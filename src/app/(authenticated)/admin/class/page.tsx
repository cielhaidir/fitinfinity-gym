"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AdminRegisterMemberToClass() {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  // Fetch upcoming classes
  const { data: classes, isLoading: classesLoading } = api.memberClass.list.useQuery({ page: 1, limit: 100 });

  // Fetch members with active subscriptions only
  const { data: members, isLoading: membersLoading } = api.member.getAll.useQuery();

  const addMutation = api.memberClass.adminAddMember.useMutation();

  const handleRegister = async () => {
    if (!selectedClassId || !selectedMemberId) return;
    try {
      await addMutation.mutateAsync({ classId: selectedClassId, memberId: selectedMemberId });
      toast.success("Member registered to class successfully");
      setSelectedClassId("");
      setSelectedMemberId("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to register member");
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Register Member to Class</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block mb-1 font-medium">Select Class</label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={classesLoading}>
              <SelectTrigger>
                <SelectValue placeholder={classesLoading ? "Loading..." : "Select a class"} />
              </SelectTrigger>
              <SelectContent>
                {classes?.items?.map((cls: any) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} ({new Date(cls.schedule).toLocaleString("id-ID")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Select Member (Active Subscription)</label>
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
          <Button
            className="w-full bg-infinity"
            onClick={handleRegister}
            disabled={!selectedClassId || !selectedMemberId || addMutation.isPending}
          >
            Register
          </Button>
        </CardContent>
      
      </Card>
    </div>
  );
}
