"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { DataTable } from "@/components/datatable/data-table";
import { permissionColumns } from "./columns";
import { api } from "@/trpc/react";
import { Permission } from "./schema";
import { PermissionForm } from "./permission-form";
import { toast } from "sonner";

export default function PermissionPage() {
    const utils = api.useUtils();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
    const [newPermission, setNewPermission] = useState<Permission>({
        name: ""
    });
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const { data: permissions = { items: [], total: 0, page: 1, limit: 10 } } = api.permission.list.useQuery({
        page,
        limit,
        search,
    });

    const handlePaginationChange = (newPage: number, newLimit: number) => {
        setPage(newPage);
        setLimit(newLimit);
    };

    const createPermissionMutation = api.permission.create.useMutation();
    const updatePermissionMutation = api.permission.update.useMutation();
    const deletePermissionMutation = api.permission.remove.useMutation();
    const createSinglePermissionMutation = api.permission.createSingle.useMutation();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (isEditMode && selectedPermission) {
            setSelectedPermission(prev => ({
                ...prev!,
                [name]: value,
            }));
        } else {
            setNewPermission(prev => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleCreateOrUpdatePermission = async (isSingle: boolean) => {
        try {
            const promise = async () => {
                if (isEditMode && selectedPermission) {
                    await updatePermissionMutation.mutateAsync({
                        id: selectedPermission.id!,
                        name: selectedPermission.name,
                    });
                } else {
                    if (isSingle) {
                        await createSinglePermissionMutation.mutateAsync({
                            name: newPermission.name.toLowerCase(),
                        });
                    } else {
                        await createPermissionMutation.mutateAsync({
                            name: newPermission.name.toLowerCase(),
                        });
                    }
                }

                await utils.permission.list.invalidate();
                setIsSheetOpen(false);
                setIsEditMode(false);
                setSelectedPermission(null);
                setNewPermission({ name: "" });
            };

            await toast.promise(promise(), {
                loading: 'Loading...',
                success: isEditMode 
                    ? 'Permission updated successfully!'
                    : (isSingle ? 'Permission created successfully!' : 'CRUD permissions created successfully!'),
                error: (error) => error instanceof Error ? error.message : String(error),
            });
        } catch (error) {
            console.error("Error handling permission:", error);
        }
    };

    const handleEditPermission = (permission: Permission) => {
        setSelectedPermission(permission);
        setIsEditMode(true);
        setIsSheetOpen(true);
    };

    const handleDeletePermission = async (permission: Permission) => {
        if (!permission.id) return;

        try {
            const promise = deletePermissionMutation.mutateAsync({ id: permission.id });

            await toast.promise(promise, {
                loading: 'Deleting permission...',
                success: 'Permission deleted successfully!',
                error: (error) => error instanceof Error ? error.message : String(error),
            });

            await utils.permission.list.invalidate();
        } catch (error) {
            console.error("Error deleting permission:", error);
        }
    };

    const columns = permissionColumns({
        onEdit: handleEditPermission,
        onDelete: handleDeletePermission,
        onEditMember: () => {},
        onDeleteMember: () => {},
        onEditPermission: () => {},
        onDeletePermission: () => {},
    });

    return (
        <>
            <Sheet
                open={isSheetOpen}
                onOpenChange={(open) => {
                    setIsSheetOpen(open);
                    if (!open) {
                        setIsEditMode(false);
                        setSelectedPermission(null);
                        setNewPermission({ name: "" });
                    }
                }}
            >
                <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
                    <div className="flex items-center justify-between space-y-2">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">
                                Permission Management
                            </h2>
                            <p className="text-muted-foreground">
                                Manage system permissions here
                            </p>
                        </div>
                        <SheetTrigger asChild>
                            <Button className="mb-4 bg-infinity">
                                <Plus className="mr-2 h-4 w-4" /> Add Permission
                            </Button>
                        </SheetTrigger>
                    </div>
                    <DataTable
                        columns={columns}
                        data={permissions}
                        onPaginationChange={handlePaginationChange}
                        searchColumns={[
                            { id: "name", placeholder: "Search by permission name..." },
                        ]}
                        onSearch={(value) => setSearch(value)}
                    />
                </div>
                <PermissionForm
                    permission={selectedPermission || newPermission}
                    onCreateOrUpdatePermission={handleCreateOrUpdatePermission}
                    onInputChange={handleInputChange}
                    isEditMode={isEditMode}
                />
            </Sheet>
        </>
    );
}
