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
    const [searchValue, setSearchValue] = useState("");

    const selectedPermissions = permissions?.filter(p => 
        selectedPermissionIds.includes(p.id)
    ) || [];

    const handleSelect = (currentValue: string) => {
        const permission = permissions?.find(p => p.name === currentValue);
        if (!permission) return;

        const newSelectedIds = selectedPermissionIds.includes(permission.id)
            ? selectedPermissionIds.filter(id => id !== permission.id)
            : [...selectedPermissionIds, permission.id];

        onPermissionsChange(newSelectedIds);
    };

    const handleCreatePermissions = (baseName: string) => {
        const crudOperations = ['create', 'edit', 'delete', 'list'];
        const permissionNames = crudOperations.map(op => `${op}_${baseName.toLowerCase()}`);
        
        // Find existing permissions with these names
        const matchingPermissions = permissions?.filter(p => 
            permissionNames.includes(p.name.toLowerCase())
        ) || [];

        // Add all matching permissions to selection
        const newSelectedIds = [...new Set([
            ...selectedPermissionIds,
            ...matchingPermissions.map(p => p.id)
        ])];

        onPermissionsChange(newSelectedIds);
        setSearchValue(""); // Clear search after adding
    };

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
                        Permissions
                    </label>
                    <div className="flex flex-wrap gap-1 py-2">
                        {selectedPermissions.map((permission) => (
                            <Badge key={permission.id} variant="secondary" className="mr-1">
                                {permission.name}
                                <button
                                    type="button"
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    onClick={() => handleSelect(permission.name)}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                    <div className="relative">
                        <Command shouldFilter={false} loop={true}>
                            <CommandInput placeholder="Search permissions..." />
                            <CommandEmpty>No permissions found.</CommandEmpty>
                            <CommandGroup>
                                {permissions?.map((permission) => (
                                    <CommandItem
                                        key={permission.id}
                                        onSelect={() => handleSelect(permission.name)}
                                    >
                                        <div className="mr-2">
                                            {selectedPermissionIds.includes(permission.id) && (
                                                <Check className="h-4 w-4" />
                                            )}
                                        </div>
                                        {permission.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </Command>
                    </div>
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
