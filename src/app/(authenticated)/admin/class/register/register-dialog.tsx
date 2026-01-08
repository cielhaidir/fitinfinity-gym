"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/_components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/_components/ui/avatar";
import { Checkbox } from "@/app/_components/ui/checkbox";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import type { Class } from "@/app/(authenticated)/member/classes/types";

interface MemberUser {
  name: string | null;
  email: string | null;
  phone: string | null;
  image?: string | null;
}

interface ApiMember {
  id: string;
  user: MemberUser;
  subscriptions: Array<{
    id: string;
    isActive: boolean;
    memberId: string;
    startDate: Date;
    trainerId: string | null;
    remainingSessions: number | null;
    packageId: string;
    endDate: Date | null;
  }>;
}

interface RegisteredMember {
  id: string;
  memberId: string;
  member: {
    id: string;
    user: MemberUser & { id: string };
  };
}

interface AdminClassRegisterDialogProps {
  class_: Class | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataUpdate?: () => Promise<void>;
}

export function AdminClassRegisterDialog({
  class_,
  open,
  onOpenChange,
  onDataUpdate,
}: AdminClassRegisterDialogProps) {
  const utils = api.useUtils();
  const { data: members, isLoading: membersLoading } = api.member.getAllActive.useQuery();
  const removeMutation = api.memberClass.adminRemoveMember.useMutation();
  const addMultipleMutation = api.memberClass.adminAddMultipleMembers.useMutation();
  const addTrialMutation = api.memberClass.adminAddTrialMember.useMutation();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [trialMemberName, setTrialMemberName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("existing");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setTrialMemberName("");
      setActiveTab("existing");
      setSelectedMemberIds([]);
    }
  }, [open]);

  // Focus search input when dialog opens and on existing tab
  useEffect(() => {
    if (open && activeTab === "existing" && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, activeTab]);

  if (!class_) return null;

  const handleRemove = async (classId: string, memberId: string) => {
    if (!classId || !memberId) return;
    
    try {
      await removeMutation.mutateAsync({ classId, memberId });
      toast.success("Member removed from class");
      await utils.memberClass.list.invalidate();
      // Update parent component data
      if (onDataUpdate) {
        await onDataUpdate();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove member");
    }
  };

  const handleRegisterMembers = async () => {
    if (!class_?.id || selectedMemberIds.length === 0) return;

    try {
      const result = await addMultipleMutation.mutateAsync({
        classId: class_.id,
        memberIds: selectedMemberIds
      });
      
      if (result.successful > 0) {
        toast.success(`Successfully registered ${result.successful} member(s) to class`);
      }
      if (result.failed > 0) {
        toast.warning(`Failed to register ${result.failed} member(s) (may already be registered)`);
      }
      
      await utils.memberClass.list.invalidate();
      setSearchTerm("");
      setSelectedMemberIds([]);
      // Update parent component data
      if (onDataUpdate) {
        await onDataUpdate();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to register members");
    }
  };

  const handleRegisterTrialMember = async () => {
    if (!class_?.id || !trialMemberName.trim()) return;

    try {
      await addTrialMutation.mutateAsync({ classId: class_.id, memberName: trialMemberName.trim() });
      toast.success("Trial member registered to class successfully");
      await utils.memberClass.list.invalidate();
      setTrialMemberName("");
      // Update parent component data before closing
      if (onDataUpdate) {
        await onDataUpdate();
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to register trial member");
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMemberIds.length === filteredMembers.length && filteredMembers.length > 0) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(filteredMembers.map(m => m.id));
    }
  };

  // Filter members based on search term
  const filteredMembers = members?.filter((member: ApiMember) => {
    if (!searchTerm) return false; // Only show results when searching
    const searchLower = searchTerm.toLowerCase();
    return (
      member.user.name?.toLowerCase().includes(searchLower) ||
      member.user.email?.toLowerCase().includes(searchLower) ||
      member.user.phone?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const isAllSelected = filteredMembers.length > 0 && selectedMemberIds.length === filteredMembers.length;
  const isSomeSelected = selectedMemberIds.length > 0 && selectedMemberIds.length < filteredMembers.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onOpenAutoFocus={(e) => e.preventDefault()}>
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
              {(class_.registeredMembers as RegisteredMember[] || []).length > 0
                ? (class_.registeredMembers as RegisteredMember[]).map((member) => {
                    const canRemove = class_.id && member.memberId;
                    return (
                      <li key={member.id}>
                        {member.member.user.name || member.member.user.email || member.member.id}
                        {canRemove && (
                          <span
                            className="ml-2 inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs cursor-pointer hover:bg-red-200 transition"
                            onClick={() => handleRemove(class_.id!, member.memberId)}
                            style={{
                              opacity: removeMutation.isPending ? 0.5 : 1,
                              pointerEvents: removeMutation.isPending ? "none" : "auto",
                            }}
                          >
                            Remove
                          </span>
                        )}
                      </li>
                    );
                  })
                : <li className="text-gray-400">No registered members</li>}
            </ul>
          </div>
          <div>
            <strong>Waiting List ({class_.waitingList?.length ?? 0}):</strong>
            <ul className="list-disc ml-5 mt-1">
              {(class_.waitingList as RegisteredMember[] || []).length > 0
                ? (class_.waitingList as RegisteredMember[]).map((member) => (
                    <li key={member.id}>
                      {member.member.user.name || member.member.user.email || member.member.id}
                    </li>
                  ))
                : <li className="text-gray-400">No waiting list</li>}
            </ul>
          </div>
        </div>
        <hr/>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Existing Member</TabsTrigger>
            <TabsTrigger value="trial">Trial Member</TabsTrigger>
          </TabsList>
          
          <TabsContent value="existing" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member-search" className="block font-medium">
                Search Member
              </Label>
              <Input
                ref={searchInputRef}
                id="member-search"
                placeholder="Search members by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              
              {filteredMembers.length > 0 && (
                <div className="flex items-center space-x-2 py-2 border-b">
                  <Checkbox
                    id="select-all"
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                    className="data-[state=checked]:bg-infinity data-[state=checked]:border-infinity"
                    ref={(el) => {
                      if (el && isSomeSelected) {
                        el.setAttribute('data-state', 'indeterminate');
                      }
                    }}
                  />
                  <Label 
                    htmlFor="select-all" 
                    className="text-sm font-medium cursor-pointer"
                  >
                    Select All ({selectedMemberIds.length} selected)
                  </Label>
                </div>
              )}
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredMembers.length === 0 && searchTerm && (
                  <div className="text-center text-muted-foreground py-4">
                    No members found matching &ldquo;{searchTerm}&rdquo;
                  </div>
                )}
                {filteredMembers.map((member) => {
                  const isSelected = selectedMemberIds.includes(member.id);
                  return (
                    <div
                      key={member.id}
                      className={`flex items-center space-x-2 p-2 border rounded hover:bg-accent transition-colors cursor-pointer ${
                        isSelected ? 'bg-accent border-infinity' : ''
                      }`}
                      onClick={() => toggleMemberSelection(member.id)}
                    >
                      <Checkbox
                        id={`member-${member.id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleMemberSelection(member.id)}
                        className="data-[state=checked]:bg-infinity data-[state=checked]:border-infinity"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={member.user.image || undefined} />
                          <AvatarFallback>
                            {member.user.name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{member.user.name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {member.user.email}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {selectedMemberIds.length > 0 && (
              <Button
                className="w-full bg-infinity"
                onClick={handleRegisterMembers}
                disabled={addMultipleMutation.isPending}
              >
                {addMultipleMutation.isPending 
                  ? "Registering..." 
                  : `Add ${selectedMemberIds.length} Member${selectedMemberIds.length > 1 ? 's' : ''} to Class`
                }
              </Button>
            )}
          </TabsContent>
          
          <TabsContent value="trial" className="space-y-4">
            <div>
              <Label htmlFor="trial-name" className="block mb-1 font-medium">
                Trial Member Name
              </Label>
              <Input
                id="trial-name"
                type="text"
                value={trialMemberName}
                onChange={(e) => setTrialMemberName(e.target.value)}
                placeholder="Enter member name for trial"
                className="w-full"
              />
              <p className="text-sm text-gray-500 mt-1">
                For gym visitors who don't have an account yet
              </p>
            </div>
            
            <Button
              className="w-full bg-infinity"
              onClick={handleRegisterTrialMember}
              disabled={!trialMemberName.trim() || addTrialMutation.isPending}
            >
              {addTrialMutation.isPending ? "Registering..." : "Register Trial Member"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}