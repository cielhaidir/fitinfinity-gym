"use client";

import React, { useState } from "react";

import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { DataTable } from "@/components/datatable/data-table";
import ModalEdit from "./modaledit";

import { getColumns } from "./columns";
import { Member } from "./schema";


export default function MemberListPage() {
  const { data: session } = useSession();
  const { data: members, isLoading, refetch: refetchMembers } = api.personalTrainer.getMembers.useQuery(undefined, {
    enabled: !!session,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Transform data to match schema and DataTable structure
  const formattedData: {
    items: Member[];
    total: number;
    page: number;
    limit: number;
  } = {
    items: members?.map((member) => ({
      id: member.id,
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      height: member.height ?? null,
      weight: member.weight ?? null,
      birthDate: member.birthDate ?? null,
      remainingSessions: member.remainingSessions || 0,
      subscriptionEndDate: member.subscriptionEndDate || new Date().toISOString(),
    })) ?? [],
    total: members?.length || 0,
    page: 1,
    limit: 10,
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const updateMemberMutation = api.personalTrainer.updateMember.useMutation();

  const handleEdit = (member: Member) => {
    setSelectedMember(member);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setSelectedMember(null);
  };

  const handleSave = async (updated: Member) => {
    try {
      await updateMemberMutation.mutateAsync(updated);
      refetchMembers(); // Refetch data after successful update
      // TODO: Add success toast/notification
    } catch (error) {
      console.error("Failed to update member:", error);
      // TODO: Add error toast/notification
    }
    setModalOpen(false);
    setSelectedMember(null);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen bg-background">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Member List</h2>
          <p className="text-muted-foreground">
            View and manage your members here
          </p>
        </div>
      </div>

      <div className="rounded-md">
      <DataTable
          columns={getColumns(handleEdit)}
          data={formattedData}
          searchColumns={[
            { id: "name", placeholder: "Search by member name..." },
            { id: "email", placeholder: "Search by email..." },
          ]}
          isLoading={isLoading}
        />
      </div>
      <ModalEdit
        open={modalOpen}
        onClose={handleClose}
        member={selectedMember}
        onSave={handleSave}
      />
    </div>
  );
} 