"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Sheet, SheetTrigger } from "@/components/ui/sheet";

import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { api } from "@/trpc/react";
import { type Member, type UserMember } from "./schema";
import { MemberForm } from "./member-form";
import { toast } from "sonner";

export default function MemberPage() {
  const utils = api.useUtils();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<UserMember | null>(null);
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showForm, setShowForm] = useState(false);

  const isSelectingForSubscription =
    searchParams.get("action") === "select-for-subscription";

  const { data: member = { items: [], total: 0, page: 1, limit: 10 } } =
    api.member.list.useQuery({
      page,
      limit,
      search,
      searchColumn,
    });


  const updateMemberMutation = api.member.update.useMutation({
    onSuccess: () => {
      utils.member.list.invalidate();
      setIsSheetOpen(false);
      setSelectedMember(null);
      toast.success("Member updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedMember) {
      const { name, value } = e.target;
      setSelectedMember({
        ...selectedMember,
        id: selectedMember.id,
        [name]: value === "" ? null : value,
      });
    }
  };

  const handleScanRFID = () => {
    console.log("Scanning RFID...");
  };

  const handleUpdateMember = async () => {
    if (!selectedMember?.id) return;

    try {
      const updateData = {
        id: selectedMember.id,
        rfidNumber: selectedMember.rfidNumber || undefined,
        fc: selectedMember.fcId
          ? {
              connect: { id: selectedMember.fcId },
            }
          : {
              disconnect: true,
            },
        personalTrainer: selectedMember.personalTrainerId
          ? {
              connect: { id: selectedMember.personalTrainerId },
            }
          : {
              disconnect: true,
            },
        user: {
          name: selectedMember.name || "",
          email: selectedMember.email || "",
          address: selectedMember.address || undefined,
          phone: selectedMember.phone || undefined,
          birthDate: selectedMember.birthDate || undefined,
          idNumber: selectedMember.idNumber || undefined,
        },
      };

      await updateMemberMutation.mutateAsync(updateData);

      toast.success("Member updated successfully");
      setSelectedMember(null);
      setShowForm(false);
      setIsSheetOpen(false);
    } catch (error) {
      console.error("Error updating member:", error);
      toast.error("Failed to update member");
    }
  };

  const handleEditMember = (member: Member) => {
    setSelectedMember({
      id: member.id,
      name: member.user.name ?? "",
      email: member.user.email ?? "",
      rfidNumber: member.rfidNumber ?? "",
      fcId: member.fc?.id ?? null,
      personalTrainerId: member.subscriptions[0]?.trainer?.id ?? "",
      address: member.user.address ?? "",
      phone: member.user.phone ?? "",
      birthDate: member.user.birthDate ?? null,
      idNumber: member.user.idNumber ?? "",
    });
    // console.log("selected ",selectedMember);
    setShowForm(true);
    setIsSheetOpen(true);
  };

  const deleteMemberMutation = api.member.remove.useMutation({
    onSuccess: () => {
      utils.member.list.invalidate();
      toast.success("Member deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDeleteMember = async (member: Member) => {
    try {
      await deleteMemberMutation.mutateAsync({ id: member.id });
    } catch (error) {
      console.error("Error deleting member:", error);
    }
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const directToSubs = (member: Member) => {
    router.push(`/management/subscription/${member.id}`);
  };

  const directToLogs = (member: Member) => {
    router.push(`/management/access-log/${member.id}`);
  };

  const customActions = [
    { label: "Subscription", action: directToSubs },
    { label: "Access Log", action: directToLogs },
  ];

  const handleMemberSelect = (member: Member) => {
    if (isSelectingForSubscription) {
      router.push(`/checkout/${member.id}`);
    }
  };

  const columns = createColumns({
    onEditMember: handleEditMember,
    onDeleteMember: handleDeleteMember,
    customActions: isSelectingForSubscription ? [] : customActions,
  });

  return (
    <>
      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            setSelectedMember(null);
            setShowForm(false);
          }
        }}
      >
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
          <div className="flex items-center justify-between space-y-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Membership Management
              </h2>
              <p className="text-muted-foreground">
                Here&apos;s a list of Fit Infinity Member!
              </p>
            </div>
          </div>
          {isSelectingForSubscription && (
            <div className="mb-4">
              <h2 className="text-2xl font-bold">
                Select Member for New Subscription
              </h2>
              <p className="text-muted-foreground">
                Click on a member to create a new subscription
              </p>
            </div>
          )}
          {showForm && selectedMember && (
            <MemberForm
              newMember={selectedMember}
              onInputChange={handleInputChange}
              onUpdate={handleUpdateMember}
              onCancel={() => {
                setSelectedMember(null);
                setShowForm(false);
                setIsSheetOpen(false);
              }}
            />
          )}
          <DataTable
            data={member}
            columns={columns}
            onPaginationChange={handlePaginationChange}
            searchColumns={[
              { id: "rfidNumber", placeholder: "Search by RFID..." },
              { id: "user.name", placeholder: "Search by name..." },
              { id: "user.email", placeholder: "Search by email..." },
            ]}
            onSearch={(value, column) => {
              setSearch(value);
              setSearchColumn(column);
            }}
          />
        </div>
      </Sheet>
    </>
  );
}
