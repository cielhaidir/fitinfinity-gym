"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { DataTable } from "@/components/datatable/data-table";
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
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
// import { createColumns } from "./columns";

interface FCMembersPageProps {
  searchParams?: { status?: string };
}

export default function FCMembersPage({ searchParams }: FCMembersPageProps) {
  const [open, setOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FcMember | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { toast } = useToast();


  const utils = api.useContext();

  const { data, isLoading } = api.fcMember.getAll.useQuery(
    { page, limit },
    {
      refetchInterval: false,
      refetchOnWindowFocus: false,
    }
  );

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
    <ProtectedRoute requiredPermissions={["menu:fc-member"]}>
      <div className="container mx-auto py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Member Management</h1>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>

        <DataTable
          columns={columns(handleEdit, handleDelete)}
          data={data ? { ...data, page, limit } : { items: [], total: 0, page, limit }}
          onPaginationChange={(newPage: number, newLimit: number) => {
            setPage(newPage);
            setLimit(newLimit);
          }}
          isLoading={isLoading}
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
    </ProtectedRoute>
  );
}
