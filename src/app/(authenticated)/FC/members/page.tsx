"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { DataTable } from "@/app/_components/datatable/data-table";
import { type FC_Member, columns } from "./columns";
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
// import { createColumns } from "./columns";

export default function FCMembersPage() {
  const [open, setOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FcMember | null>(null);
  const { toast } = useToast();

  
  const utils = api.useContext();

  const { data: members, isLoading } = api.fcMember.getAll.useQuery(undefined, {
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

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


  // const columns = createColumns({ onEditModel: handleEdit, onDeleteModel: handleDelete })

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Member Management</h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={{
          items: members || [],
          total: members?.length || 0,
          page: 1,
          limit: 10
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
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