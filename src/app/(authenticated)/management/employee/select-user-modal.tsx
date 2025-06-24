"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/datatable/data-table";
import { api } from "@/trpc/react";
import { type User } from "@prisma/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

type SelectUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
  onAddNew: () => void;
};

export const SelectUserModal = ({
  isOpen,
  onClose,
  onSelectUser,
  onAddNew,
}: SelectUserModalProps) => {
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const utils = api.useUtils();

  const createEmployeeMutation = api.employee.create.useMutation({
    onSuccess: () => {
      toast.success("Employee record created successfully");
      utils.employee.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Error creating employee: ${error.message}`);
      console.error("Employee creation error:", error);
    },
  });

  const handleUserSelect = async (user: User) => {
    if (!position || !department) {
      toast.error("Please fill in position and department");
      return;
    }

    try {
      await createEmployeeMutation.mutateAsync({
        userId: user.id,
        position,
        department,
        isActive: true,
        id: user.id,
        image: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          name: user.name,
          email: user.email,
          address: user.address || "",
          phone: user.phone || "",
          birthDate: user.birthDate || new Date(),
          idNumber: user.idNumber || "",
        },
      });

      onSelectUser(user);
      onClose();
    } catch (error) {
      console.error("Error in handleUserSelect:", error);
      toast.error("Failed to create employee record");
    }
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const { data: users = { items: [], total: 0, page: 1, limit: 10 } } =
    api.user.list.useQuery({
      page,
      limit,
      search,
      searchColumn,
    });

  const columns = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <Button
            variant="outline"
            onClick={() => handleUserSelect(row.original)}
          >
            Select
          </Button>
        );
      },
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Select User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="position"
                className="mb-1 block text-sm font-medium"
              >
                Position
              </label>
              <Input
                id="position"
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full"
                placeholder="Enter position"
              />
            </div>
            <div>
              <label
                htmlFor="department"
                className="mb-1 block text-sm font-medium"
              >
                Department
              </label>
              <Input
                id="department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full"
                placeholder="Enter department"
              />
            </div>
          </div>
          <DataTable
            data={{
              items: users.items,
              total: users.total,
              page: users.page,
              limit: users.limit,
            }}
            columns={columns}
            searchColumns={[
              { id: "name", placeholder: "Search by name..." },
              { id: "email", placeholder: "Search by email..." },
            ]}
            onSearch={(value, column) => {
              setSearch(value);
              setSearchColumn(column);
              setPage(1); // Reset to first page when searching
            }}
            onPaginationChange={handlePaginationChange}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onAddNew} className="mr-2">
            + Add New User
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
