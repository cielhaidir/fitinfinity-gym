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
import { Badge } from "@/components/ui/badge";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Input } from "@/components/ui/input";

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
    const [searchTerm, setSearchTerm] = useState("");

    const filteredPermissions = permissions?.filter(permission =>
        permission.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <Select 
                        value={roleId} 
                        onValueChange={onRoleChange}
                        disabled={isEditMode}
                    >
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
                <div className="flex flex-col gap-2">
                    <label className="block text-sm font-medium">
                        Permissions
                    </label>
                    <div className="flex flex-wrap gap-1 mb-2">
                        {selectedPermissionIds.map((id) => {
                            const permission = permissions?.find((p) => p.id === id);
                            return permission ? (
                                <Badge
                                    key={permission.id}
                                    variant="secondary"
                                    className="mr-1 mb-1"
                                >
                                    {permission.name}
                                    <button
                                        type="button"
                                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                        onClick={() => {
                                            onPermissionsChange(
                                                selectedPermissionIds.filter((p) => p !== permission.id)
                                            );
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ) : null;
                        })}
                    </div>
                    <div className="border rounded-md p-2">
                        <Input
                            type="text"
                            placeholder="Search permissions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="mb-2"
                        />
                        <div className="max-h-[200px] overflow-y-auto">
                            {filteredPermissions?.map((permission) => {
                                const isSelected = selectedPermissionIds.includes(permission.id);
                                return (
                                    <div
                                        key={permission.id}
                                        className={cn(
                                            "flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-sm",
                                            isSelected && "bg-accent"
                                        )}
                                        onClick={() => {
                                            if (isSelected) {
                                                onPermissionsChange(
                                                    selectedPermissionIds.filter((p) => p !== permission.id)
                                                );
                                            } else {
                                                onPermissionsChange([...selectedPermissionIds, permission.id]);
                                            }
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "h-4 w-4",
                                                isSelected ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <span>{permission.name}</span>
                                    </div>
                                );
                            })}
                        </div>
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