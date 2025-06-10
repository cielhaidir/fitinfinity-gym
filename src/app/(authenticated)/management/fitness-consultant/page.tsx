"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";

import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { api } from "@/trpc/react";
import { type UserFC } from "./schema";
import { FCForm } from "./fc-form";
import { toast } from "sonner";
import { SelectUserModal } from "./select-user-modal";
import { type User } from "@prisma/client";

export default function FCPage() {
  const utils = api.useUtils();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedFC, setSelectedFC] = useState<UserFC | null>(null);
  const [newFC, setNewFC] = useState<UserFC>({
    name: "",
    email: "",
    address: "",
    phone: "",
    birthDate: new Date(),
    idNumber: "",
    password: "",
  });
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isSelectUserModalOpen, setIsSelectUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: fcs = { items: [], total: 0, page: 1, limit: 10 } } =
    api.fc.list.useQuery({
      page,
      limit,
      search,
      searchColumn,
    });
  const createUserMutation = api.user.create.useMutation();
  const createFCMutation = api.fc.create.useMutation({
    onSuccess: () => {
      toast.success("FC created successfully");
      utils.fc.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const updateFCMutation = api.fc.update.useMutation();
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

    if (isEditMode && selectedFC) {
      setSelectedFC((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          user: {
            ...prev.user,
            [name]: updatedValue,
          } as UserFC["user"],
        };
      });
    } else {
      setNewFC((prev) => ({
        ...prev,
        [name]: updatedValue,
      }));
    }
  };

  const handleCreateOrUpdateFC = async () => {
    try {
      const promise = async () => {
        if (isEditMode && selectedFC) {
          await updateFCMutation.mutateAsync({
            id: selectedFC.id ?? "",
            user: {
              name: selectedFC.user?.name ?? null,
              email: selectedFC.user?.email ?? null,
              address: selectedFC.user?.address ?? null,
              phone: selectedFC.user?.phone ?? null,
              birthDate: selectedFC.user?.birthDate ?? null,
              idNumber: selectedFC.user?.idNumber ?? null,
            },
          });

          await utils.fc.list.invalidate();
          setIsSheetOpen(false);
          setIsEditMode(false);
          setSelectedFC(null);
        } else if (selectedUserId) {
          console.log(
            "Starting creation process with selected user:",
            selectedUserId,
          );

          // Create FC first
          const fc = await createFCMutation.mutateAsync({
            userId: selectedUserId,
            isActive: true,
            createdBy: selectedUserId,
          });

          console.log("FC created successfully:", fc);

          // Then create employee record
          try {
            console.log("Attempting to create employee record...");
            const employee = await createEmployeeMutation.mutateAsync({
              id: selectedUserId,
              userId: selectedUserId,
              position: "Fitness Consultant",
              department: "Sales",
              isActive: true,
              image: "",
              createdAt: new Date(),
              updatedAt: new Date(),
              user: {
                name: null,
                email: null,
                phone: null,
                address: null,
                birthDate: null,
                idNumber: null,
              },
            });
            console.log("Employee created successfully:", employee);
          } catch (employeeError) {
            console.error("Detailed employee creation error:", {
              error: employeeError,
              message:
                employeeError instanceof Error
                  ? employeeError.message
                  : String(employeeError),
              stack:
                employeeError instanceof Error
                  ? employeeError.stack
                  : undefined,
            });
            // If employee creation fails, we should rollback the FC creation
            if (fc?.id) {
              await utils.fc.remove.mutateAsync({ id: fc.id });
            }
            throw employeeError;
          }

          await utils.fc.list.invalidate();
          await utils.employee.list.invalidate();
          setSelectedUserId(null);
          setIsSheetOpen(false);
        } else {
          console.log("Starting creation process with new user");

          // Create new user with password
          const user = await createUserMutation.mutateAsync({
            name: newFC.name,
            email: newFC.email,
            address: newFC.address,
            phone: newFC.phone,
            birthDate: newFC.birthDate,
            password: newFC.password,
          });

          console.log("User created successfully:", user);

          // Create employee record first
          try {
            console.log("Attempting to create employee record...");
            const employee = await createEmployeeMutation.mutateAsync({
              id: user.id,
              userId: user.id,
              position: "Fitness Consultant",
              department: "Sales",
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
            if (user?.id) {
              await utils.user.remove.mutateAsync({ id: user.id });
            }
            throw employeeError;
          }

          // Create FC
          const fc = await createFCMutation.mutateAsync({
            userId: user.id,
            isActive: true,
            createdBy: user.id,
          });

          console.log("FC created successfully:", fc);

          await utils.fc.list.invalidate();
          await utils.employee.list.invalidate();
          setNewFC({
            name: "",
            email: "",
            address: "",
            phone: "",
            birthDate: new Date(),
            idNumber: "",
            password: "",
          });
          setIsSheetOpen(false);
        }
      };

      toast.promise(promise, {
        loading: "Loading...",
        success: "FC has been created/updated successfully!",
        error: (error) =>
          error instanceof Error ? error.message : String(error),
      });
    } catch (error) {
      console.error("Detailed error in handleCreateOrUpdateFC:", {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const handleEditFC = (fc: UserFC) => {
    console.log("Editing FC:", fc);
    setSelectedFC(fc);
    setIsEditMode(true);
    setIsSheetOpen(true);
  };

  const deleteFCMutation = api.fc.remove.useMutation();

  const handleDeleteFC = async (fc: UserFC) => {
    console.log("Deleting FC:", fc);

    const promise = deleteFCMutation.mutateAsync({ id: fc.id ?? "" });

    toast.promise(promise, {
      loading: "Deleting FC...",
      success: "FC deleted successfully!",
      error: (error) =>
        error instanceof Error ? error.message : String(error),
    });

    await promise;
    await utils.fc.list.invalidate();
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const columns = createColumns({
    onEditMember: handleEditFC,
    onDeleteMember: handleDeleteFC,
  });

  const handleSelectUser = async (user: User) => {
    try {
      // Create FC with selected user
      await createFCMutation.mutateAsync({
        userId: user.id,
        isActive: true,
        createdBy: user.id,
      });

      setIsSelectUserModalOpen(false);
    } catch (error) {
      console.error("Error creating FC:", error);
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
            setSelectedFC(null);
          }
        }}
      >
        <div className="container mx-auto min-h-screen bg-background p-4 md:p-8">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">
                Fitness Consultant Management
              </h2>
              <p className="text-muted-foreground">
                Here&apos;s a list of Fit Infinity Fitness Consultants!
              </p>
            </div>
            <Button
              className="w-full bg-infinity md:w-auto"
              onClick={() => setIsSelectUserModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Fitness Consultant
            </Button>
          </div>
          <div className="rounded-md">
            <DataTable
              data={{
                items: fcs.items,
                total: fcs.total,
                page: fcs.page,
                limit: fcs.limit,
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
          <FCForm
            newFC={selectedFC || newFC}
            onCreateOrUpdateFC={handleCreateOrUpdateFC}
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
