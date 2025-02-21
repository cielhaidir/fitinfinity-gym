"use client";

import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Permission } from "./schema";
import { api } from "@/trpc/react";
import { Select } from "@/app/_components/ui/select";

type PermissionFormProps = {
    permission: Permission;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRolesChange: (roleIds: string[]) => void;
    onCreateOrUpdatePermission: () => void;
    isEditMode: boolean;
};

export const PermissionForm: React.FC<PermissionFormProps> = ({
    permission,
    onInputChange,
    onRolesChange,
    onCreateOrUpdatePermission,
    isEditMode,
}) => {
    const { data: roles = [] } = api.permission.getAllRoles.useQuery();

    const selectedRoleIds = permission.roles?.map(r => r.role.id) ?? [];

    return (
        <SheetContent side="right" className="w-full overflow-y-auto">
            <SheetHeader>
                <SheetTitle>
                    {isEditMode ? "Edit Permission" : "Create New Permission"}
                </SheetTitle>
                <SheetDescription>
                    {isEditMode
                        ? "Edit the permission details."
                        : "Add a new permission to the system."}
                </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 py-8 sm:px-0 px-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium">
                        Permission Name
                    </label>
                    <Input
                        id="name"
                        name="name"
                        placeholder="Permission Name"
                        value={permission.name}
                        onChange={onInputChange}
                    />
                </div>
                <div>
                    <label htmlFor="roles" className="block text-sm font-medium">
                        Assigned Roles
                    </label>
                    <Select
                        options={roles.map(role => ({
                            value: role.id,
                            label: role.name
                        }))}
                        value={selectedRoleIds.map(id => ({
                            value: id,
                            label: roles.find(r => r.id === id)?.name || ''
                        }))}
                        onChange={(val: {value: string, label: string}[]) => onRolesChange(val.map(v => v.value))}
                        placeholder="Select roles..."
                    />
                </div>
            </div>
            <SheetFooter className="flex justify-end gap-2">
                <Button onClick={onCreateOrUpdatePermission} className="bg-infinity">
                    {isEditMode ? "Update Permission" : "Create Permission"}
                </Button>
                <SheetClose asChild>
                    <Button variant="outline">Cancel</Button>
                </SheetClose>
            </SheetFooter>
        </SheetContent>
    );
}; 