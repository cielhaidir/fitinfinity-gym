"use client";

import { useState, useEffect } from "react";
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
import Select, { StylesConfig } from "react-select";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import type { Class } from "@/app/(authenticated)/member/classes/types";

type MemberOption = {
  value: string;
  label: string;
};

interface MemberUser {
  name: string | null;
  email: string | null;
  phone: string | null;
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
}

const selectStyles: StylesConfig<MemberOption, false> = {
  control: (baseStyles) => ({
    ...baseStyles,
    backgroundColor: "hsl(222.2 84% 4.9%)",
    borderColor: "hsl(217.2 32.6% 17.5%)",
    borderRadius: "var(--radius)",
    minHeight: "2.25rem",
    boxShadow: "none",
    "&:hover": {
      borderColor: "hsl(217.2 32.6% 17.5%)"
    }
  }),
  menu: (baseStyles) => ({
    ...baseStyles,
    backgroundColor: "hsl(222.2 84% 4.9%)",
    border: "1px solid hsl(217.2 32.6% 17.5%)",
    borderRadius: "var(--radius)",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    color: "hsl(210 40% 98%)"
  }),
  menuPortal: (baseStyles) => ({
    ...baseStyles,
    zIndex: 9999
  }),
  option: (baseStyles, { isSelected, isFocused }) => ({
    ...baseStyles,
    backgroundColor: isSelected 
      ? "hsl(217.2 32.6% 17.5%)"
      : isFocused
        ? "hsl(217.2 32.6% 12.5%)"
        : "transparent",
    color: "hsl(210 40% 98%)",
    cursor: "pointer",
    "&:active": {
      backgroundColor: "hsl(217.2 32.6% 17.5%)"
    }
  }),
  input: (baseStyles) => ({
    ...baseStyles,
    color: "hsl(210 40% 98%)"
  }),
  singleValue: (baseStyles) => ({
    ...baseStyles,
    color: "hsl(210 40% 98%)"
  }),
  placeholder: (baseStyles) => ({
    ...baseStyles,
    color: "hsl(215 20.2% 65.1%)"
  }),
  menuList: (baseStyles) => ({
    ...baseStyles,
    padding: "4px",
    "::-webkit-scrollbar": {
      width: "8px",
      height: "8px",
    },
    "::-webkit-scrollbar-track": {
      background: "transparent",
    },
    "::-webkit-scrollbar-thumb": {
      background: "hsl(217.2 32.6% 17.5%)",
      borderRadius: "9999px",
    },
    "::-webkit-scrollbar-thumb:hover": {
      background: "hsl(217.2 32.6% 25%)",
    }
  }),
  dropdownIndicator: (baseStyles, { isFocused }) => ({
    ...baseStyles,
    color: isFocused ? "hsl(210 40% 98%)" : "hsl(215 20.2% 65.1%)",
    "&:hover": {
      color: "hsl(210 40% 98%)"
    }
  }),
  clearIndicator: (baseStyles) => ({
    ...baseStyles,
    color: "hsl(215 20.2% 65.1%)",
    "&:hover": {
      color: "hsl(210 40% 98%)"
    }
  })
};

export function AdminClassRegisterDialog({
  class_,
  open,
  onOpenChange,
}: AdminClassRegisterDialogProps) {
  const utils = api.useUtils();
  const { data: members, isLoading: membersLoading } = api.member.getAllActive.useQuery();
  const removeMutation = api.memberClass.adminRemoveMember.useMutation();
  const addMutation = api.memberClass.adminAddMember.useMutation();
  const addTrialMutation = api.memberClass.adminAddTrialMember.useMutation();
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [trialMemberName, setTrialMemberName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("existing");

  useEffect(() => {
    if (!open) {
      setSelectedMemberId("");
      setTrialMemberName("");
      setActiveTab("existing");
    }
  }, [open]);

  if (!class_) return null;

  const handleRemove = async (classId: string, memberId: string) => {
    if (!classId || !memberId) return;
    
    try {
      await removeMutation.mutateAsync({ classId, memberId });
      toast.success("Member removed from class");
      await utils.memberClass.list.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove member");
    }
  };

  const handleRegister = async () => {
    if (!class_?.id) return;

    if (activeTab === "existing") {
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
    } else {
      if (!trialMemberName.trim()) return;

      try {
        await addTrialMutation.mutateAsync({ classId: class_.id, memberName: trialMemberName.trim() });
        toast.success("Trial member registered to class successfully");
        await utils.memberClass.list.invalidate();
        setTrialMemberName("");
        onOpenChange(false);
      } catch (err: any) {
        toast.error(err?.message || "Failed to register trial member");
      }
    }
  };

  const memberOptions: MemberOption[] = members?.map((member: ApiMember) => ({
    value: member.id,
    label: member.user.name || member.user.email || member.user.phone || member.id
  })) || [];

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
            <div>
              <Label htmlFor="member-select" className="block mb-1 font-medium">
                Select Member
              </Label>
              <Select<MemberOption>
                menuPortalTarget={document.body}
                styles={selectStyles}
                options={memberOptions}
                value={memberOptions.find(option => option.value === selectedMemberId)}
                onChange={(newValue) => setSelectedMemberId(newValue?.value || "")}
                isLoading={membersLoading}
                isDisabled={membersLoading}
                placeholder="Select a member"
                isClearable
                className="w-full"
                classNamePrefix="react-select"
                maxMenuHeight={200}
              />
            </div>
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
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button
            className="w-full bg-infinity"
            onClick={handleRegister}
            disabled={
              (activeTab === "existing" && !selectedMemberId) ||
              (activeTab === "trial" && !trialMemberName.trim()) ||
              addMutation.isPending ||
              addTrialMutation.isPending
            }
          >
            {addMutation.isPending || addTrialMutation.isPending ? "Registering..." : "Register"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
