"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { Sheet, SheetTrigger } from "@/components/ui/sheet";

import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { api } from "@/trpc/react";
import { UserPersonalTrainer } from "./schema";
import { TrainerForm } from "./trainer-form";
import { toast } from "sonner"

export default function PersonalTrainerPage() {
  const utils = api.useUtils();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<UserPersonalTrainer | null>(null);
  const [newTrainer, setNewTrainer] = useState<UserPersonalTrainer>({
   
    name: "",
    email: "",
    address: "",
    phone: "",
    birthDate: new Date(),
    idNumber: "",
  });
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");

  const { data: trainers = { items: [], total: 0, page: 1, limit: 10 } } = api.personalTrainer.list.useQuery({ 
    page: 1, 
    limit: 10,
    search,
    searchColumn 
  });
  const createUserMutation = api.user.create.useMutation();
  const createTrainerMutation = api.personalTrainer.create.useMutation();
  const updateTrainerMutation = api.personalTrainer.update.useMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedValue = name === 'birthDate' ? new Date(value) : value;
    
    if (isEditMode && selectedTrainer) {
      setSelectedTrainer(prev => {
        if (!prev) return null;
        return {
          ...prev,
          user: {
            ...prev.user,
            [name]: updatedValue,
          } as UserPersonalTrainer['user'],
        };
      });
    } else {
      setNewTrainer(prev => ({
        ...prev,
        [name]: updatedValue,
      }));
    }
  };



  const handleCreateOrUpdateTrainer = async () => {
    try {
      const promise = async () => {
      if (isEditMode && selectedTrainer) {
        await updateTrainerMutation.mutateAsync({
          id: selectedTrainer.id ?? "",
          user: {
            name: selectedTrainer.user?.name || "",
            email: selectedTrainer.user?.email || "",
            address: selectedTrainer.user?.address ?? undefined,
            phone: selectedTrainer.user?.phone ?? undefined,
            birthDate: selectedTrainer.user?.birthDate ?? undefined,
            idNumber: selectedTrainer.user?.idNumber ?? undefined,
          }
        });

        await utils.personalTrainer.list.invalidate();
        setIsSheetOpen(false);
        setIsEditMode(false);
        setSelectedTrainer(null);

      } else {
        
        const user = await createUserMutation.mutateAsync({
          name: newTrainer.name,
          email: newTrainer.email,
          address: newTrainer.address,
          phone: newTrainer.phone,
          birthDate: newTrainer.birthDate,
          idNumber: newTrainer.idNumber,
        });

        
        await createTrainerMutation.mutateAsync({
          userId: user.id,
          isActive: true,
          createdBy: user.id,
        });

        await utils.personalTrainer.list.invalidate();
        
        setNewTrainer({
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
      success: 'Trainer has been created/updated successfully!',
      error: (error) => error instanceof Error ? error.message : String(error),
    });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
      console.error("Error creating trainer:", error);
    }
  };



  const handleEditTrainer = (trainer: UserPersonalTrainer) => {
    console.log("Editing trainer:", trainer);
    setSelectedTrainer(trainer);
    setIsEditMode(true);
    setIsSheetOpen(true);
  };

  const deleteTrainerMutation = api.personalTrainer.remove.useMutation();

  const handleDeleteTrainer = async (trainer: UserPersonalTrainer) => {
    console.log("Deleting trainer:", trainer);

    const promise = deleteTrainerMutation.mutateAsync({ id: trainer.id ?? "" });

    toast.promise(promise, {
      loading: 'Deleting trainer...',
      success: 'Trainer deleted successfully!',
      error: (error) => error instanceof Error ? error.message : String(error),
    });

    await promise;
    await utils.personalTrainer.list.invalidate();
  };

  const handlePaginationChange = (page: number, limit: number) => {
    utils.personalTrainer.list.invalidate({ page, limit });
  };

  const columns = createColumns({ onEditMember: handleEditTrainer, onDeleteMember: handleDeleteTrainer })
  
  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={(open) => {
        setIsSheetOpen(open);
        if (!open) {
          setIsEditMode(false);
          setSelectedTrainer(null);
        }
      }}>
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
          <div className="flex items-center justify-between space-y-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Personal Trainer Management
              </h2>
              <p className="text-muted-foreground">
                Here&apos;s a list of Fit Infinity Personal Trainers!
              </p>
            </div>
            <SheetTrigger asChild>
              <Button className="mb-4 bg-infinity">
                <Plus className="mr-2 h-4 w-4" /> Add Personal Trainer
              </Button>
            </SheetTrigger>
          </div>
          <TrainerForm
            newTrainer={selectedTrainer || newTrainer}
            onCreateOrUpdateTrainer={handleCreateOrUpdateTrainer}
            onInputChange={handleInputChange}
            isEditMode={isEditMode}
          />
          <DataTable
            data={{
              items: trainers.items,
              total: trainers.total,
              page: trainers.page,
              limit: trainers.limit
            }}
            columns={columns}
            onPaginationChange={handlePaginationChange}
            searchColumns={[
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
