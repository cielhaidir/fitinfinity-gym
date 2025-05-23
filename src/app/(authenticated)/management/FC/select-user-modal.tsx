"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/datatable/data-table";
import { api } from "@/trpc/react";
import { User } from "@prisma/client";
import { toast } from "sonner";

type SelectUserModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSelectUser: (user: User) => void;
    onAddNew: () => void;
};

export const SelectUserModal = ({ isOpen, onClose, onSelectUser, onAddNew }: SelectUserModalProps) => {
    const [search, setSearch] = useState("");
    const [searchColumn, setSearchColumn] = useState<string>("");
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

    const createFCMutation = api.fc.create.useMutation({
        onSuccess: () => {
            toast.success("FC created successfully");
            utils.fc.list.invalidate();
        },
        onError: (error) => {
            toast.error(`Error creating FC: ${error.message}`);
            console.error("FC creation error:", error);
        },
    });

    const handleUserSelect = async (user: User) => {
        try {
            let employeeCreated = false;
            
            try {
                // Create employee record first with all required fields
                await createEmployeeMutation.mutateAsync({
                    id: user.id,  // Use user.id as employee id
                    userId: user.id,
                    position: "Fitness Consultant",
                    department: "Sales",
                    isActive: true,
                    image: "",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    user: user, // Include the full user object
                });
                employeeCreated = true;
            } catch (employeeError: any) {
                // If error is not about duplicate entry, throw it
                if (!employeeError.message.includes("Unique constraint")) {
                    throw employeeError;
                }
                // If it's duplicate entry, we can proceed
                employeeCreated = true;
            }

            if (employeeCreated) {
                try {
                    // Create FC record
                    await createFCMutation.mutateAsync({
                        userId: user.id,
                        isActive: true,
                        createdBy: user.id,
                    });
                    
                    toast.success("Successfully created FC");
                    await utils.fc.list.invalidate();
                    await utils.employee.list.invalidate();
                    onClose();
                } catch (fcError: any) {
                    console.error("FC creation error:", fcError);
                    if (fcError.message.includes("Unique constraint")) {
                        toast.error("This user is already a FC");
                    } else {
                        toast.error("Failed to create FC: " + fcError.message);
                    }
                }
            }
        } catch (error: any) {
            console.error("Error in handleUserSelect:", error);
            toast.error("Failed to process: " + error.message);
        }
    };

    const { data: users = { items: [], total: 0, page: 1, limit: 10 } } = api.user.list.useQuery({
        page,
        limit,
        search,
        searchColumn,
    }, {
        keepPreviousData: true
    });

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handleLimitChange = (newLimit: number) => {
        setLimit(newLimit);
        setPage(1); // Reset to first page when changing limit
    };

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
            cell: ({ row }: { row: { original: User } }) => {
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
            <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Select User</DialogTitle>
                </DialogHeader>
                <div className="py-2">
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
                            setPage(1);
                        }}
                        onPageChange={handlePageChange}
                        onLimitChange={handleLimitChange}
                        pageSizeOptions={[10, 20, 50, 100]}
                    />
                </div>
                <div className="flex justify-end mt-4">
                    <Button 
                        variant="outline" 
                        onClick={onAddNew}
                        className="mr-2"
                    >
                        + Add New User
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}; 