"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { DataTable } from "@/components/datatable/data-table";
import { roleColumns } from "./columns";
import { api } from "@/trpc/react";
import { type Role } from "./schema";
import { RoleForm } from "./role-form";
import { toast } from "sonner";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function RolePage() {
  const utils = api.useUtils();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState<Role>({
    name: "",
  });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: roles = { items: [], total: 0, page: 1, limit: 10 }, isLoading } =
    api.role.list.useQuery({
      page,
      limit,
      search,
    });

  const createRoleMutation = api.role.create.useMutation();
  const updateRoleMutation = api.role.update.useMutation();
  const deleteRoleMutation = api.role.remove.useMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (isEditMode && selectedRole) {
      setSelectedRole((prev) => ({
        ...prev!,
        [name]: value,
      }));
    } else {
      setNewRole((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleCreateOrUpdateRole = async () => {
    try {
      const promise = async () => {
        if (isEditMode && selectedRole) {
          await updateRoleMutation.mutateAsync({
            id: selectedRole.id!,
            name: selectedRole.name,
          });
        } else {
          await createRoleMutation.mutateAsync({
            name: newRole.name,
          });
        }

        await utils.role.list.invalidate();
        setIsSheetOpen(false);
        setIsEditMode(false);
        setSelectedRole(null);
        setNewRole({ name: "" });
      };

      toast.promise(promise, {
        loading: "Loading...",
        success: `Role ${isEditMode ? "updated" : "created"} successfully!`,
        error: (error) =>
          error instanceof Error ? error.message : String(error),
      });
    } catch (error) {
      console.error("Error handling role:", error);
    }
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setIsEditMode(true);
    setIsSheetOpen(true);
  };

  const handleDeleteRole = async (role: Role) => {
    const promise = deleteRoleMutation.mutateAsync({ id: role.id! });

    toast.promise(promise, {
      loading: "Deleting role...",
      success: "Role deleted successfully!",
      error: (error) =>
        error instanceof Error ? error.message : String(error),
    });

    await promise;
    await utils.role.list.invalidate();
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const columns = roleColumns({
    onEdit: handleEditRole,
    onDelete: handleDeleteRole,
    onEditMember: () => {}, // Add missing required prop
    onDeleteMember: () => {}, // Add missing required prop
  });

  return (
    <ProtectedRoute requiredPermissions={["menu:role"]}>
      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            setIsEditMode(false);
            setSelectedRole(null);
          }
        }}
      >
        <div className="container mx-auto min-h-screen bg-background p-4 md:p-8">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">
                Role Management
              </h2>
              <p className="text-muted-foreground">Manage system roles here</p>
            </div>
            <SheetTrigger asChild>
              <Button className="w-full bg-infinity md:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add Role
              </Button>
            </SheetTrigger>
          </div>
          <div className="rounded-md">
            <DataTable
              columns={columns}
              data={roles}
              isLoading={isLoading}
              onPaginationChange={handlePaginationChange}
              searchColumns={[
                { id: "name", placeholder: "Search by role name..." },
              ]}
              onSearch={(value) => {
                setSearch(value);
                setPage(1); // Reset to first page when searching
              }}
            />
          </div>
        </div>
        <RoleForm
          role={selectedRole || newRole}
          onCreateOrUpdateRole={handleCreateOrUpdateRole}
          onInputChange={handleInputChange}
          isEditMode={isEditMode}
        />
      </Sheet>
    </ProtectedRoute>
  );
}
