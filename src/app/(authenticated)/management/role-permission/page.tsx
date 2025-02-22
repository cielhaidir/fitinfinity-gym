"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { DataTable } from "@/components/datatable/data-table";
import { roleColumns } from "./columns";
import { api } from "@/trpc/react";
import { RolePermissionForm } from "./role-permission-form";
import { toast } from "sonner";

export default function RolePermissionPage() {
    const utils = api.useUtils();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedRoleId, setSelectedRoleId] = useState<string>("");
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
    const [search, setSearch] = useState("");

    const { data: rolePermissions = { items: [], total: 0, page: 1, limit: 10 } } = api.rolePermission.list.useQuery({
        page: 1,
        limit: 10,
        search,
    });

    const createRolePermissionMutation = api.rolePermission.create.useMutation();
    const updateRolePermissionMutation = api.rolePermission.update.useMutation();
    const deleteRolePermissionMutation = api.rolePermission.remove.useMutation();

    const handlePermissionsChange = (permissionIds: string[]) => {
        setSelectedPermissionIds(permissionIds);
    };

    const handleCreateOrUpdateRolePermission = async () => {
        try {
            const promise = async () => {
                if (isEditMode) {
                    await updateRolePermissionMutation.mutateAsync({
                        roleId: selectedRoleId,
                        permissionIds: selectedPermissionIds
                    });
                } else {
                    await createRolePermissionMutation.mutateAsync({
                        roleId: selectedRoleId,
                        permissionIds: selectedPermissionIds
                    });
                }

                await utils.rolePermission.list.invalidate();
                setIsSheetOpen(false);
                setIsEditMode(false);
                setSelectedRoleId("");
                setSelectedPermissionIds([]);
            };

            toast.promise(promise, {
                loading: 'Loading...',
                success: `Permissions ${isEditMode ? 'updated' : 'assigned'} successfully!`,
                error: (error) => error instanceof Error ? error.message : String(error),
            });
        } catch (error) {
            console.error("Error handling role permissions:", error);
        }
    };

    const handleEditRolePermission = async (roleId: string) => {
        const permissions = await utils.rolePermission.getPermissionsByRole.fetch({ roleId });
        setSelectedRoleId(roleId);
        setSelectedPermissionIds(permissions.map(p => p.permission.id));
        setIsEditMode(true);
        setIsSheetOpen(true);
    };

    const handleDeleteRolePermission = async (roleId: string, permissionId: string) => {
        const promise = deleteRolePermissionMutation.mutateAsync({ 
            roleId,
            permissionId
        });

        toast.promise(promise, {
            loading: 'Removing permission...',
            success: 'Permission removed successfully!',
            error: (error) => error instanceof Error ? error.message : String(error),
        });

        await promise;
        await utils.rolePermission.list.invalidate();
    };

    const handlePaginationChange = (page: number, limit: number) => {
        utils.rolePermission.list.invalidate({ page, limit });
    };

    const columns = roleColumns({
        onEdit: (role) => handleEditRolePermission(role.id!),
        onDelete: (role) => {
            if (!role.id || !role.permissions?.[0]?.permission.id) return;
            handleDeleteRolePermission(role.id, role.permissions[0].permission.id);
        },
        onEditMember: () => {},
        onDeleteMember: () => {}
    });

    return (
        <>
            <Sheet
                open={isSheetOpen}
                onOpenChange={(open) => {
                    setIsSheetOpen(open);
                    if (!open) {
                        setIsEditMode(false);
                        setSelectedRoleId("");
                        setSelectedPermissionIds([]);
                    }
                }}
            >
                <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
                    <div className="flex items-center justify-between space-y-2">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">
                                Role Permissions
                            </h2>
                            <p className="text-muted-foreground">
                                Manage role permissions here
                            </p>
                        </div>
                        <SheetTrigger asChild>
                            <Button className="mb-4 bg-infinity">
                                <Plus className="mr-2 h-4 w-4" /> Assign Permissions
                            </Button>
                        </SheetTrigger>
                    </div>
                    <DataTable
                        columns={columns}
                        data={{
                            items: rolePermissions.items.map(item => ({
                                name: item.role.name,
                                id: item.role.id,
                                permissions: [{
                                    permission: item.permission
                                }]
                            })),
                            total: rolePermissions.total,
                            page: rolePermissions.page,
                            limit: rolePermissions.limit
                        }}
                        onPaginationChange={handlePaginationChange}
                        searchColumns={[
                            { id: "role.name", placeholder: "Search by role name..." },
                        ]}
                        onSearch={(value) => setSearch(value)}
                    />
                </div>
                <RolePermissionForm
                    roleId={selectedRoleId}
                    selectedPermissionIds={selectedPermissionIds}
                    onPermissionsChange={handlePermissionsChange}
                    onRoleChange={(roleId: string) => {
                        setSelectedRoleId(roleId);
                    }}
                    onCreateOrUpdateRolePermission={handleCreateOrUpdateRolePermission}
                    isEditMode={isEditMode}
                />
            </Sheet>
        </>
    );
}
