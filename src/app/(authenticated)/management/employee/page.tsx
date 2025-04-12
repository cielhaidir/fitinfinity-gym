"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { DataTable } from "@/components/datatable/data-table";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { EmployeeForm } from "./employee-form";
import { UserEmployee } from "./schema";
import { getColumns } from "./columns";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

export default function EmployeePage() {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<UserEmployee | null>(null);
    const [search, setSearch] = useState("");
    const [searchColumn, setSearchColumn] = useState<string>("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

    const utils = api.useUtils();

    const { data: employees = { items: [], total: 0, page: 1, limit: 10 } } = api.employee.list.useQuery({
        page,
        limit,
        search,
        searchColumn,
    });

    const createEmployeeMutation = api.employee.create.useMutation({
        onError: (error) => {
            if (error.message.includes("Unique constraint failed")) {
                toast.error("This user is already registered as an employee");
            } else {
                toast.error(error.message);
            }
        },
        onSuccess: () => {
            toast.success("Employee created successfully");
            utils.employee.list.invalidate();
            setIsSheetOpen(false);
        },
    });

    const updateEmployeeMutation = api.employee.update.useMutation({
        onSuccess: () => {
            toast.success("Employee updated successfully");
            utils.employee.list.invalidate();
            setIsSheetOpen(false);
        },
        onError: (error) => {
            toast.error(error.message);
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

    const handleCreateOrUpdateEmployee = async () => {
        if (!selectedEmployee) return;

        try {
            if (isEditMode) {
                await updateEmployeeMutation.mutateAsync({
                    id: selectedEmployee.id!,
                    position: selectedEmployee.position,
                    department: selectedEmployee.department,
                    image: selectedEmployee.image,
                    isActive: selectedEmployee.isActive,
                });
            } else {
                await createEmployeeMutation.mutateAsync({
                    userId: selectedEmployee.userId,
                    position: selectedEmployee.position,
                    department: selectedEmployee.department,
                    image: selectedEmployee.image,
                    isActive: selectedEmployee.isActive,
                });
            }
        } catch (error) {
            console.error("Error creating/updating employee:", error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedEmployee) return;

        const { name, value } = e.target;
        setSelectedEmployee({
            ...selectedEmployee,
            [name]: value,
        });
    };

    const handleEdit = (employee: UserEmployee) => {
        setSelectedEmployee(employee);
        setIsEditMode(true);
        setIsSheetOpen(true);
    };

    const handleDelete = async (id: string) => {
        const promise = deleteEmployeeMutation.mutateAsync(id);

        toast.promise(promise, {
            loading: 'Deleting employee...',
            success: 'Employee deleted successfully!',
            error: (error) => error instanceof Error ? error.message : String(error),
        });

        await promise;
        await utils.employee.list.invalidate();
        setEmployeeToDelete(null);
    };

    const handlePaginationChange = (newPage: number, newLimit: number) => {
        setPage(newPage);
        setLimit(newLimit);
    };

    const handleSelectUser = (userId: string) => {
        if (!selectedEmployee) return;
        setSelectedEmployee({
            ...selectedEmployee,
            userId,
        });
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
        }
    });

    return (
        <>
            <Sheet 
                open={isSheetOpen} 
                onOpenChange={(open) => {
                    setIsSheetOpen(open);
                    if (!open) {
                        setIsEditMode(false);
                        setSelectedEmployee(null);
                    }
                }}
            >
                <div className="container mx-auto p-4 md:p-8 min-h-screen bg-background">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">
                                Employee Management
                            </h2>
                            <p className="text-muted-foreground">
                                Here&apos;s a list of Fit Infinity Employees!
                            </p>
                        </div>
                        <Button 
                            className="bg-infinity w-full md:w-auto"
                            onClick={() => {
                                setSelectedEmployee({
                                    user: {
                                        id: "",
                                        name: "",
                                        email: "",
                                    },
                                    userId: "",
                                    position: "",
                                    department: "",
                                    image: "",
                                    isActive: true,
                                });
                                setIsEditMode(false);
                                setIsSheetOpen(true);
                            }}
                        >
                            <Plus className="mr-2 h-4 w-4" /> Add Employee
                        </Button>
                    </div>
                    <div className="rounded-md">
                        <DataTable
                            data={{
                                items: employees.items,
                                total: employees.total,
                                page: employees.page,
                                limit: employees.limit
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
                </div>
                <EmployeeForm
                    newEmployee={selectedEmployee || {
                        userId: "",
                        position: "",
                        department: "",
                        image: "",
                        isActive: true,
                    }}
                    onCreateOrUpdateEmployee={handleCreateOrUpdateEmployee}
                    onInputChange={handleInputChange}
                    onSelectUser={handleSelectUser}
                    isEditMode={isEditMode}
                />
            </Sheet>

            <AlertDialog open={!!employeeToDelete} onOpenChange={() => setEmployeeToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the employee.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => employeeToDelete && handleDelete(employeeToDelete)}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
} 