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
import { Member, UserMember } from "./schema";
import { MemberForm } from "./member-form";
import { toast } from "sonner"

export default function MemberPage() {
  const utils = api.useUtils();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedMember, setSelectedMember] = useState<UserMember | null>(null);
  const [newMember, setNewMember] = useState<UserMember>({
    rfidNumber: "",
    name: "",
    email: "",
    address: "",
    phone: "",
    birthDate: new Date(),
    idNumber: "",
  });
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const isSelectingForSubscription = searchParams.get('action') === 'select-for-subscription';

  const { data: member = { items: [], total: 0, page: 1, limit: 10 } } = api.member.list.useQuery({ 
    page, 
    limit,
    search,
    searchColumn 
  });

  const createUserMutation = api.user.create.useMutation();
  const createMembershipMutation = api.member.create.useMutation();
  const updateMemberMutation = api.member.update.useMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedValue = name === 'birthDate' ? new Date(value) : value;
    
    if (isEditMode && selectedMember) {
      setSelectedMember(prev => {
        if (!prev) return null;
        return {
          ...prev,
          user: {
            ...prev.user,
            [name]: updatedValue,
          } as UserMember['user'],
        };
      });
    } else {
      setNewMember(prev => ({
        ...prev,
        [name]: updatedValue,
      }));
    }
  };

  const handleScanRFID = () => {
    console.log("Scanning RFID...");
  };


  const handleCreateOrUpdateMember = async () => {
    try {
      const promise = async () => {
      if (isEditMode && selectedMember) {
        await updateMemberMutation.mutateAsync({
          id: selectedMember.id ?? "",
          rfidNumber: selectedMember.rfidNumber ?? undefined,
          user: {
            name: selectedMember.user?.name || "",
            email: selectedMember.user?.email || "",
            address: selectedMember.user?.address ?? undefined,
            phone: selectedMember.user?.phone ?? undefined,
            birthDate: selectedMember.user?.birthDate ?? undefined,
            idNumber: selectedMember.user?.idNumber ?? undefined,
          }
        });

        await utils.member.list.invalidate();
        setIsSheetOpen(false);
        setIsEditMode(false);
        setSelectedMember(null);

      } else {
        
        const user = await createUserMutation.mutateAsync({
          name: newMember.name,
          email: newMember.email,
          address: newMember.address,
          phone: newMember.phone,
          birthDate: newMember.birthDate,
          idNumber: newMember.idNumber,
        });

        
        await createMembershipMutation.mutateAsync({
          userId: user.id,
          registerDate: new Date(),
          rfidNumber: newMember.rfidNumber ?? "",
          isActive: true,
          createdBy: user.id,
        });

        await utils.member.list.invalidate();
        
        setNewMember({
          rfidNumber: "",
          name: "",
          email: "",
          address: "",
          phone: "",
          birthDate: new Date(),
          idNumber: "",
        });

        setIsSheetOpen(false);
      }
    }
    toast.promise(promise, {
      loading: 'Loading...',
      success: 'Member has been created/updated successfully!',
      error: (error) => error instanceof Error ? error.message : String(error),
    });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
      console.error("Error creating member:", error);
    }
  };



  const handleEditMember = (member: UserMember) => {
    console.log("Editing member:", member);
    setSelectedMember(member);
    setIsEditMode(true);
    setIsSheetOpen(true);
  };

  const deleteMemberMutation = api.member.remove.useMutation();

  const handleDeleteMember = async (member: UserMember) => {
    console.log("Deleting member:", member);

    const promise = deleteMemberMutation.mutateAsync({ id: member.id ?? "" });

    toast.promise(promise, {
      loading: 'Deleting member...',
      success: 'Member deleted successfully!',
      error: (error) => error instanceof Error ? error.message : String(error),
    });

    await promise;
    await utils.member.list.invalidate();
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const directToSubs = (member: Member) => {
    router.push(`/management/subscription/${member.id}`);  // Make sure this matches your folder structure
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
    customActions: isSelectingForSubscription ? [] : customActions
  });

  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={(open) => {
        setIsSheetOpen(open);
        if (!open) {
          setIsEditMode(false);
          setSelectedMember(null);
        }
      }}>
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
            <SheetTrigger asChild>
              <Button className="mb-4 bg-infinity">
                <Plus className="mr-2 h-4 w-4" /> Create Member
              </Button>
            </SheetTrigger>
          </div>
          {isSelectingForSubscription && (
            <div className="mb-4">
                <h2 className="text-2xl font-bold">Select Member for New Subscription</h2>
                <p className="text-muted-foreground">Click on a member to create a new subscription</p>
            </div>
          )}
          <MemberForm
            newMember={selectedMember || newMember}
            onScanRFID={handleScanRFID}
            onCreateOrUpdateMember={handleCreateOrUpdateMember}
            onInputChange={handleInputChange}
            isEditMode={isEditMode}
          />
          <DataTable
            data={member}
            columns={columns}
            onPaginationChange={handlePaginationChange}
            searchColumns={[
              { id: "user.name", placeholder: "Search by name..." },
              { id: "user.email", placeholder: "Search by email..." },
              { id: "rfidNumber", placeholder: "Search by RFID..." }
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
