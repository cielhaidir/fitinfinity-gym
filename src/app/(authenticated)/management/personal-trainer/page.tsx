"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";

import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { api } from "@/trpc/react";
import { type UserPersonalTrainer } from "./schema";
import { TrainerForm } from "./trainer-form";
import { toast } from "sonner";
import { SelectUserModal } from "./select-user-modal";
import { type User } from "@prisma/client";

export default function PersonalTrainerPage() {
  const utils = api.useUtils();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTrainer, setSelectedTrainer] =
    useState<UserPersonalTrainer | null>(null);
  const [newTrainer, setNewTrainer] = useState<UserPersonalTrainer>({
    name: "",
    email: "",
    address: "",
    phone: "",
    birthDate: new Date(),
    idNumber: "",
    password: "",
    description: "",
  });
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isSelectUserModalOpen, setIsSelectUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: trainers = { items: [], total: 0, page: 1, limit: 10 } } =
    api.personalTrainer.list.useQuery({
      page,
      limit,
      search,
      searchColumn,
    });
  const createUserMutation = api.user.create.useMutation();
  const createTrainerMutation = api.personalTrainer.create.useMutation({
    onSuccess: () => {
      toast.success("Personal Trainer created successfully");
      utils.personalTrainer.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const updateTrainerMutation = api.personalTrainer.update.useMutation();
  const createEmployeeMutation = api.employee.create.useMutation({
    onSuccess: (data) => {
      console.log("Employee creation success:", data);
      toast.success("Employee record created successfully");
      utils.employee.list.invalidate();
    },
    onError: (error) => {
      console.error("Employee creation error details:", {
        message: error.message,
        data: error.data,
        shape: error.shape,
      });
      toast.error(`Error creating employee: ${error.message}`);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedValue = name === "birthDate" ? new Date(value) : value;

    if (isEditMode && selectedTrainer) {
      setSelectedTrainer((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          user: {
            ...prev.user,
            [name]: updatedValue,
          } as UserPersonalTrainer["user"],
        };
      });
    } else {
      setNewTrainer((prev) => ({
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
            },
          });

          await utils.personalTrainer.list.invalidate();
          setIsSheetOpen(false);
          setIsEditMode(false);
          setSelectedTrainer(null);
        } else if (selectedUserId) {
          console.log(
            "Starting creation process with selected user:",
            selectedUserId,
          );

          // Create personal trainer first
          const trainer = await createTrainerMutation.mutateAsync({
            userId: selectedUserId,
            isActive: true,
            createdBy: selectedUserId,
          });

          console.log("Trainer created successfully:", trainer);

          // Then create employee record
          try {
            console.log("Attempting to create employee record...");
            const employee = await createEmployeeMutation.mutateAsync({
              userId: selectedUserId,
              position: "Personal Trainer",
              department: "Fitness",
              isActive: true,
            });
            console.log("Employee created successfully:", employee);
          } catch (employeeError) {
            console.error("Detailed employee creation error:", {
              error: employeeError,
              message: employeeError.message,
              stack: employeeError.stack,
            });
            // If employee creation fails, we should rollback the trainer creation
            await utils.personalTrainer.remove.mutateAsync({ id: trainer.id });
            throw employeeError;
          }

          await utils.personalTrainer.list.invalidate();
          await utils.employee.list.invalidate();
          setSelectedUserId(null);
          setIsSheetOpen(false);
        } else {
          console.log("Starting creation process with new user");

          // Create new user with password
          const user = await createUserMutation.mutateAsync({
            name: newTrainer.name,
            email: newTrainer.email,
            address: newTrainer.address,
            phone: newTrainer.phone,
            birthDate: newTrainer.birthDate,
            idNumber: newTrainer.idNumber,
            password: newTrainer.password,
          });

          console.log("User created successfully:", user);

          // Create employee record first
          try {
            console.log("Attempting to create employee record...");
            const employee = await createEmployeeMutation.mutateAsync({
              id: user.id,
              userId: user.id,
              position: "Personal Trainer",
              department: "Fitness",
              isActive: true,
              image: "",
              createdAt: new Date(),
              updatedAt: new Date(),
              user: user,
            });
            console.log("Employee created successfully:", employee);
          } catch (employeeError) {
            console.error("Employee creation error:", employeeError);
            // If employee creation fails, we should rollback user creation
            await utils.user.remove.mutateAsync({ id: user.id });
            throw employeeError;
          }

          // Create personal trainer
          const trainer = await createTrainerMutation.mutateAsync({
            userId: user.id,
            isActive: true,
            createdBy: user.id,
          });

          console.log("Trainer created successfully:", trainer);

          await utils.personalTrainer.list.invalidate();
          await utils.employee.list.invalidate();
          setNewTrainer({
            name: "",
            email: "",
            address: "",
            phone: "",
            birthDate: new Date(),
            idNumber: "",
            password: "",
            description: "",
          });
          setIsSheetOpen(false);
        }
      };

      toast.promise(promise, {
        loading: "Loading...",
        success: "Trainer has been created/updated successfully!",
        error: (error) =>
          error instanceof Error ? error.message : String(error),
      });
    } catch (error) {
      console.error("Detailed error in handleCreateOrUpdateTrainer:", {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast.error(error instanceof Error ? error.message : String(error));
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
      loading: "Deleting trainer...",
      success: "Trainer deleted successfully!",
      error: (error) =>
        error instanceof Error ? error.message : String(error),
    });

    await promise;
    await utils.personalTrainer.list.invalidate();
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const columns = createColumns({
    onEditMember: handleEditTrainer,
    onDeleteMember: handleDeleteTrainer,
  });

  const handleSelectUser = async (user: User) => {
    try {
      // Create PT with selected user
      await createTrainerMutation.mutateAsync({
        userId: user.id,
        isActive: true,
        createdBy: user.id,
      });

      setIsSelectUserModalOpen(false);
    } catch (error) {
      console.error("Error creating personal trainer:", error);
    }
  };

  const handleAddNew = () => {
    setIsSelectUserModalOpen(false);
    setIsSheetOpen(true);
  };

  return (
    <>
      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            setIsEditMode(false);
            setSelectedTrainer(null);
          }
        }}
      >
        <div className="container mx-auto min-h-screen bg-background p-4 md:p-8">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">
                Personal Trainer Management
              </h2>
              <p className="text-muted-foreground">
                Here&apos;s a list of Fit Infinity Personal Trainers!
              </p>
            </div>
            <Button
              className="w-full bg-infinity md:w-auto"
              onClick={() => setIsSelectUserModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Personal Trainer
            </Button>
          </div>
          <div className="rounded-md">
            <DataTable
              data={{
                items: trainers.items,
                total: trainers.total,
                page: trainers.page,
                limit: trainers.limit,
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
                setPage(1); // Reset to first page when searching
              }}
            />
          </div>
        </div>
        <SheetContent side="right" className="w-full overflow-y-auto">
          <TrainerForm
            newTrainer={selectedTrainer || newTrainer}
            onCreateOrUpdateTrainer={handleCreateOrUpdateTrainer}
            onInputChange={handleInputChange}
            isEditMode={isEditMode}
          />
        </SheetContent>
      </Sheet>
      <SelectUserModal
        isOpen={isSelectUserModalOpen}
        onClose={() => setIsSelectUserModalOpen(false)}
        onSelectUser={handleSelectUser}
        onAddNew={handleAddNew}
      />
    </>
  );
}
