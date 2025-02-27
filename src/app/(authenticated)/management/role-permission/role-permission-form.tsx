"use client";

import {
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type RolePermissionFormProps = {
    roleId: string;
    selectedPermissionIds: string[];
    onRoleChange: (roleId: string) => void;
    onPermissionsChange: (permissionIds: string[]) => void;
    onCreateOrUpdateRolePermission: () => void;
    isEditMode: boolean;
};

export const RolePermissionForm: React.FC<RolePermissionFormProps> = ({
    roleId,
    selectedPermissionIds,
    onRoleChange,
    onPermissionsChange,
    onCreateOrUpdateRolePermission,
    isEditMode,
}) => {
    const { data: roles } = api.rolePermission.getRoles.useQuery();
    const { data: permissions } = api.rolePermission.getPermissions.useQuery();

    return (
        <SheetContent side="right" className="w-full overflow-y-auto">
            <SheetHeader>
                <SheetTitle>
                    {isEditMode ? "Edit Role Permissions" : "Assign Role Permissions"}
                </SheetTitle>
                <SheetDescription>
                    {isEditMode
                        ? "Edit permissions for this role."
                        : "Assign permissions to a role."}
                </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 py-8 sm:px-0 px-4">
                <div>
                    <label htmlFor="role" className="block text-sm font-medium">
                        Role
                    </label>
                    <Select value={roleId} onValueChange={onRoleChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a role..." />
                        </SelectTrigger>
                        <SelectContent>
                            {roles?.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                    {role.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="block text-sm font-medium">
                        Permission
                    </label>
                    <Select 
                        value={selectedPermissionIds[0] || ""} 
                        onValueChange={(value) => onPermissionsChange([value])}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a permission..." />
                        </SelectTrigger>
                        <SelectContent>
                            {permissions?.map((permission) => (
                                <SelectItem key={permission.id} value={permission.id}>
                                    {permission.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <SheetFooter className="flex justify-end gap-2">
                <SheetClose asChild>
                    <Button 
                        type="button"
                        onClick={onCreateOrUpdateRolePermission}
                        className="bg-infinity"
                        disabled={!roleId || selectedPermissionIds.length === 0}
                    >
                        {isEditMode ? "Update Permissions" : "Assign Permissions"}
                    </Button>
                </SheetClose>
                <SheetClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </SheetClose>
            </SheetFooter>
        </SheetContent>
    );
};