"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { DataTable } from "@/components/datatable/data-table";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { EmployeeForm } from "./employee-form";
import { type UserEmployee } from "./schema";
import { getColumns } from "./columns";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { SelectUserModal } from "./select-user-modal";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function EmployeePage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<UserEmployee | null>(
    null,
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  const utils = api.useUtils();

  const [newEmployee, setNewEmployee] = useState<UserEmployee>({
    id: "",
    name: "",
    email: "",
    password: "",
    position: "",
    department: "",
    address: "",
    phone: "",
    birthDate: new Date(),
    idNumber: "",
  });

  const { data: employees = { items: [], total: 0, page: 1, limit: 10 } } =
    api.employee.list.useQuery({
      page,
      limit,
      search,
      searchColumn,
    });

  const createUserMutation = api.user.create.useMutation({
    onSuccess: () => {
      toast.success("User created successfully");
      utils.user.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Error creating user: ${error.message}`);
    },
  });

  const createEmployeeMutation = api.employee.create.useMutation({
    onSuccess: () => {
      toast.success("Employee created successfully");
      utils.employee.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Error creating employee: ${error.message}`);
    },
  });

  const updateEmployeeMutation = api.employee.update.useMutation({
    onSuccess: () => {
      toast.success("Employee updated successfully");
      utils.employee.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Error updating employee: ${error.message}`);
    },
  });

  const deleteEmployeeMutation = api.employee.delete.useMutation({
    onSuccess: () => {
      toast.success("Employee deleted successfully");
      utils.employee.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewEmployee((prev) => ({
      ...prev,
      [name]: name === "birthDate" ? new Date(value) : value,
    }));
  };

  const handleCreateOrUpdateEmployee = async () => {
    try {
      const promise = async () => {
        if (isEditMode && selectedEmployee) {
          await updateEmployeeMutation.mutateAsync({
            id: selectedEmployee.id!,
            position: newEmployee.position,
            department: newEmployee.department,
          });
        } else if (selectedUserId) {
          // Create employee for selected user
          await createEmployeeMutation.mutateAsync({
            userId: selectedUserId,
            position: newEmployee.position,
            department: newEmployee.department,
            isActive: true,
            id: selectedUserId, // Using userId as employee id
            image: "", // Empty string for image
            createdAt: new Date(),
            updatedAt: new Date(),
            user: {
              name: newEmployee.name,
              email: newEmployee.email,
              address: newEmployee.address,
              phone: newEmployee.phone,
              birthDate: newEmployee.birthDate,
              idNumber: newEmployee.idNumber,
            },
          });
        } else {
          // Create new user and employee
          const user = await createUserMutation.mutateAsync({
            name: newEmployee.name,
            email: newEmployee.email,
            password: newEmployee.password,
            address: newEmployee.address,
            phone: newEmployee.phone,
            birthDate: newEmployee.birthDate,
            fcId: null, // Required property based on the error message
          });

          await createEmployeeMutation.mutateAsync({
            userId: user.id,
            position: newEmployee.position,
            department: newEmployee.department,
            isActive: true,
            id: user.id, // Using user.id as employee id
            image: "", // Empty string for image
            createdAt: new Date(),
            updatedAt: new Date(),
            user: {
              name: user.name,
              email: user.email,
              address: user.address,
              phone: user.phone,
              birthDate: user.birthDate,
              idNumber: user.idNumber,
            },
          });
        }

        // Reset form
        setNewEmployee({
          name: "",
          email: "",
          password: "",
          position: "",
          department: "",
          address: "",
          phone: "",
          birthDate: new Date(),
          idNumber: "",
        });
        setIsSheetOpen(false);
        setSelectedUserId(null);
      };

      toast.promise(promise, {
        loading: "Loading...",
        success: "Employee has been created/updated successfully!",
        error: (error) =>
          error instanceof Error ? error.message : String(error),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const handleEdit = (employee: UserEmployee) => {
    setSelectedEmployee(employee);
    setNewEmployee({
      id: employee.id ?? "",
      name: employee.user?.name ?? "",
      email: employee.user?.email ?? "",
      password: "",
      position: employee.position ?? "",
      department: employee.department ?? "",
      address: employee.user?.address ?? "",
      phone: employee.user?.phone ?? "",
      birthDate: employee.user?.birthDate ?? new Date(),
      idNumber: employee.user?.idNumber ?? "",
    });
    setIsEditMode(true);
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: string) => {
    const promise = deleteEmployeeMutation.mutateAsync(id);

    toast.promise(promise, {
      loading: "Deleting employee...",
      success: "Employee deleted successfully!",
      error: (error) =>
        error instanceof Error ? error.message : String(error),
    });

    await promise;
    await utils.employee.list.invalidate();
    setEmployeeToDelete(null);
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const handleSelectUser = (user: any) => {
    setSelectedUserId(user.id);
    setNewEmployee((prev) => ({
      ...prev,
      name: user.name,
      email: user.email,
      address: user.address,
      phone: user.phone,
      birthDate: user.birthDate,
      idNumber: user.idNumber,
    }));
    setIsModalOpen(false);
    setIsSheetOpen(true);
  };

  const columns = getColumns({
    handleEdit,
    handleDelete: (id: string) => {
      return (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setEmployeeToDelete(id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      );
    },
  });

  return (
    <ProtectedRoute requiredPermissions={["menu:employees"]}>
      <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employee Management</h1>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#C9D953] hover:bg-[#B8C84A]"
        >
          + Add New Employee
        </Button>
      </div>

      <DataTable
        data={{
          items: employees.items,
          total: employees.total,
          page: employees.page,
          limit: employees.limit,
        }}
        columns={columns}
        onPaginationChange={handlePaginationChange}
        searchColumns={[
          { id: "user.name", placeholder: "Search by name..." },
          { id: "user.email", placeholder: "Search by email..." },
          { id: "rfidTag", placeholder: "Search by RFID..." },
        ]}
        onSearch={(value, column) => {
          setSearch(value);
          setSearchColumn(column);
        }}
      />

      <SelectUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectUser={handleSelectUser}
        onAddNew={() => {
          setIsModalOpen(false);
          setIsSheetOpen(true);
        }}
      />

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <EmployeeForm
          newEmployee={newEmployee}
          onInputChange={handleInputChange}
          onCreateOrUpdateEmployee={handleCreateOrUpdateEmployee}
          isEditMode={isEditMode}
        />
      </Sheet>

      <AlertDialog
        open={!!employeeToDelete}
        onOpenChange={() => setEmployeeToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              employee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => employeeToDelete && handleDelete(employeeToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </ProtectedRoute>
  );
}
