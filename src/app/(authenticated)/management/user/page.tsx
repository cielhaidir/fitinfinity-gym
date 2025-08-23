"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { DataTable } from "@/components/datatable/data-table";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { UserForm } from "./user-form";
import { createColumns } from "./columns";
import { signIn } from "next-auth/react";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function UserPage() {
  const utils = api.useUtils();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: users = { items: [], total: 0, page: 1, limit: 10 } } =
    api.user.list.useQuery({
      page,
      limit,
      search,
      searchColumn,
    });
  console.log(users);

  const createUserMutation = api.user.create.useMutation({
    onSuccess: () => {
      toast.success("User created successfully");
      utils.user.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateUserMutation = api.user.update.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully");
      utils.user.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteUserMutation = api.user.delete.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      utils.user.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateOrUpdateUser = async (userData: any) => {
    try {
      if (isEditMode && selectedUser) {
        await updateUserMutation.mutateAsync({
          id: selectedUser.id,
          name: userData.name,
          email: userData.email,
          address: userData.address,
          phone: userData.phone,
          birthDate: userData.birthDate
            ? new Date(userData.birthDate)
            : undefined,
          idNumber: userData.idNumber,
          roleIds: userData.roleIds,
        });
      } else {
        await createUserMutation.mutateAsync(userData);
      }
      setIsSheetOpen(false);
      setIsEditMode(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error handling user:", error);
    }
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setIsEditMode(true);
    setIsSheetOpen(true);
  };

  const handleDelete = async (user: any) => {
    try {
      await deleteUserMutation.mutateAsync({ id: user.id });
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const handleBypassLogin = async (user: any) => {
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: user.email,
        password: process.env.NEXT_PUBLIC_BYPASS_SECRET,
      });

      if (result?.error) {
        toast.error(`Bypass failed: ${result.error}`);
      } else {
        toast.success("Bypass successful!");
        window.location.href = "/"; // Redirect to dashboard
      }
    } catch (error) {
      console.error("Bypass login error:", error);
      toast.error("An unexpected error occurred during bypass.");
    }
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const columns = createColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onBypassLogin: handleBypassLogin,
  });

  return (
    <ProtectedRoute requiredPermissions={["menu:user"]}>
      <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button className="bg-[#C9D953] hover:bg-[#B8C84A]">
              <Plus className="mr-2 h-4 w-4" /> Add New User
            </Button>
          </SheetTrigger>
          <UserForm
            user={selectedUser}
            onSubmit={handleCreateOrUpdateUser}
            isEditMode={isEditMode}
          />
        </Sheet>
      </div>

      <DataTable
        data={{
          items: users.items,
          total: users.total,
          page: users.page,
          limit: users.limit,
        }}
        columns={columns}
        onPaginationChange={handlePaginationChange}
        searchColumns={[
          { id: "name", placeholder: "Search by name..." },
          { id: "email", placeholder: "Search by email..." },
        ]}
        onSearch={(value, column) => {
          setSearch(value);
          setSearchColumn(column);
        }}
      />
      </div>
    </ProtectedRoute>
  );
}
