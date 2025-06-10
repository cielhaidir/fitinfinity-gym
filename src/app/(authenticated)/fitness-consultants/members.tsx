"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { DataTable } from "@/app/_components/datatable/data-table";
import { columns, type FC_Member } from "./members-columns";
import { Button } from "@/app/_components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import { FCMemberForm } from "./fc-member-form";
import type { FcMember } from "@prisma/client";

interface PageProps {
  searchParams?: { status?: string };
}

export default function FCMembersPage({ searchParams }: PageProps) {
  const [open, setOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FcMember | null>(null);
  const { toast } = useToast();

  const utils = api.useContext();

  const { data: members, isLoading } = api.fcMember.getAll.useQuery(undefined, {
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const filteredMembers =
    members?.filter(
      (member) =>
        !searchParams?.status || member.status === searchParams.status,
    ) || [];

  const deleteMutation = api.fcMember.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member deleted successfully",
      });
      utils.fcMember.getAll.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setSelectedMember(null);
    setOpen(true);
  };

  const handleEdit = (member: FcMember) => {
    setSelectedMember(member);
    setOpen(true);
  };

  const handleDelete = async (member: FcMember) => {
    if (confirm("Are you sure you want to delete this member?")) {
      deleteMutation.mutate({ id: member.id });
    }
  };

  const tableColumns = columns(handleEdit, handleDelete);

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Member Management</h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      <DataTable
        columns={tableColumns}
        data={{
          items: filteredMembers.map((member) => ({
            ...member,
            onEdit: handleEdit,
            onDelete: handleDelete,
          })) as FC_Member[],
          total: filteredMembers.length,
          page: 1,
          limit: 10,
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedMember ? "Edit Member" : "Add New Member"}
            </DialogTitle>
          </DialogHeader>
          <FCMemberForm
            initialData={selectedMember || undefined}
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
