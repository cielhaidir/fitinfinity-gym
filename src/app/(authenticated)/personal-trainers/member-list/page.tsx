"use client";

import React, { useState, useMemo } from "react";

import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { DataTable } from "@/components/datatable/data-table";
import ModalEdit from "./modaledit";

import { getColumns } from "./columns";
import { type Member } from "./schema";

interface MemberData {
  id: string;
  membershipId: string;
  name: string;
  email: string;
  phone: string;
  height: number | null;
  weight: number | null;
  birthDate: string | null;
  remainingSessions: number;
  subscriptionEndDate: string;
}

interface PaginatedResponse {
  items: MemberData[];
  total: number;
  page: number;
  limit: number;
}

export default function MemberListPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const {
    data: members,
    isLoading,
    refetch: refetchMembers,
  } = api.personalTrainer.getMembers.useQuery(undefined, {
    enabled: !!session,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Combine members with same name and sum their remaining sessions
  const combinedMembers = useMemo(() => {
    if (!members) return [];

    const memberMap = new Map<string, Member>();

    members.forEach((member: MemberData) => {
      const existingMember = memberMap.get(member.name);
      if (existingMember) {
        // If member already exists, add remaining sessions
        existingMember.remainingSessions += member.remainingSessions;
        // Keep the latest subscription end date
        if (
          new Date(member.subscriptionEndDate) >
          new Date(existingMember.subscriptionEndDate)
        ) {
          existingMember.subscriptionEndDate = member.subscriptionEndDate;
        }
      } else {
        // If member doesn't exist, add new entry
        memberMap.set(member.name, {
          id: member.id,
          name: member.name,
          email: member.email,
          phone: member.phone,
          height: member.height,
          weight: member.weight,
          birthDate: member.birthDate,
          remainingSessions: member.remainingSessions,
          subscriptionEndDate: member.subscriptionEndDate,
        });
      }
    });

    return Array.from(memberMap.values());
  }, [members]);

  // Transform data to match schema and DataTable structure
  const formattedData: PaginatedResponse = {
    items: combinedMembers,
    total: combinedMembers.length,
    page: page,
    limit: limit,
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

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  return (
    <div className="container mx-auto min-h-screen bg-background p-4 md:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Member List</h2>
          <p className="text-muted-foreground">
            View and manage your members here
          </p>
        </div>
      </div>

      {/* Tabel untuk desktop */}
      <div className="rounded-md overflow-x-auto">
        <div className="min-w-[700px]">
          <DataTable
            columns={getColumns(handleEdit)}
            data={formattedData}
            searchColumns={[
              { id: "name", placeholder: "Search by member name..." },
              { id: "email", placeholder: "Search by email..." },
            ]}
            isLoading={isLoading}
            onPaginationChange={handlePaginationChange}
          />
        </div>
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
