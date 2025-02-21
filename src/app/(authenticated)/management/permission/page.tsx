"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { DataTable } from "@/components/datatable/data-table";
import { createColumns, permissionColumns } from "./columns";
import { api } from "@/trpc/react";
import { Permission } from "./schema";
import { PermissionForm } from "./permission-form";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";

export default function PermissionPage() {
    const utils = api.useUtils();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
    const [newPermission, setNewPermission] = useState<Permission>({
        id: "",
        name: "",
    });
    const [search, setSearch] = useState("");
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

    const { data: permissions = { permissions: [], total: 0, page: 1, limit: 10 } } = api.permission.list.useQuery({
        page: 1,
        limit: 10,
        search,
    });

    const createPermissionMutation = api.permission.create.useMutation();
    const updatePermissionMutation = api.permission.update.useMutation();
    const deletePermissionMutation = api.permission.remove.useMutation();

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

    const handleRolesChange = (roleIds: string[]) => {
        if (isEditMode && selectedPermission) {
            setSelectedPermission(prev => ({
                ...prev!,
                roles: roleIds.map(id => ({ role: { id, name: '' } }))
            }));
        } else {
            setSelectedRoles(roleIds);
        }
    };

    const handleCreateOrUpdatePermission = async () => {
        try {
            const promise = async () => {
                if (isEditMode && selectedPermission) {
                    await updatePermissionMutation.mutateAsync({
                        id: selectedPermission.id,
                        name: selectedPermission.name,
                        roleIds: selectedPermission.roles?.map(r => r.role.id) ?? []
                    });
                } else {
                    await createPermissionMutation.mutateAsync({
                        name: newPermission.name,
                        roleIds: selectedRoles
                    });
                }

                await utils.permission.list.invalidate();
                setIsSheetOpen(false);
                setIsEditMode(false);
                setSelectedPermission(null);
                setNewPermission({ id: "", name: "" });
                setSelectedRoles([]);
            };

            toast.promise(promise, {
                loading: 'Loading...',
                success: `Permission ${isEditMode ? 'updated' : 'created'} successfully!`,
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
        const promise = deletePermissionMutation.mutateAsync({ id: permission.id });

        toast.promise(promise, {
            loading: 'Deleting permission...',
            success: 'Permission deleted successfully!',
            error: (error) => error instanceof Error ? error.message : String(error),
        });

        await promise;
        await utils.permission.list.invalidate();
    };

    const handlePaginationChange = (page: number, limit: number) => {
        utils.permission.list.invalidate({ page, limit });
    };

    const columns = permissionColumns({
        onEdit: handleEditPermission,
        onDelete: handleDeletePermission,
        onEditMember: () => {}, // These props are still required by the type but unused
        onDeleteMember: () => {}, // These props are still required by the type but unused
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
                    <PermissionForm
                        permission={selectedPermission || newPermission}
                        onCreateOrUpdatePermission={handleCreateOrUpdatePermission}
                        onInputChange={handleInputChange}
                        onRolesChange={handleRolesChange}
                        isEditMode={isEditMode}
                    />
                    <DataTable
                        columns={columns as ColumnDef<unknown, unknown>[]}
                        data={{
                            memberships: permissions.permissions,
                            total: permissions.total,
                            page: permissions.page,
                            limit: permissions.limit
                        }}
                        onPaginationChange={handlePaginationChange}
                        searchColumns={[
                            { id: "name", placeholder: "Search by permission name..." },
                        ]}
                        onSearch={(value) => setSearch(value)}
                    />
                </div>
            </Sheet>
        </>
    );
}
