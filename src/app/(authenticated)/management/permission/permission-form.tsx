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
import { Input } from "@/components/ui/input";
import { Permission } from "./schema";
import { Switch } from "@/components/ui/switch";

import { useState } from "react";

type PermissionFormProps = {
    permission: Permission;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCreateOrUpdatePermission: (isSingle: boolean) => void;
    isEditMode: boolean;
};

export const PermissionForm: React.FC<PermissionFormProps> = ({
    permission,
    onInputChange,
    onCreateOrUpdatePermission,
    isEditMode,
}) => {
    const [isSinglePermission, setIsSinglePermission] = useState(false);

    return (
        <SheetContent side="right" className="w-full overflow-y-auto">
            <SheetHeader>
                <SheetTitle>
                    {isEditMode ? "Edit Permission" : "Create New Permissions"}
                </SheetTitle>
                <SheetDescription>
                    {isEditMode
                        ? "Edit the permission name."
                        : "Create a single permission or CRUD permission set"}
                </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 py-8 sm:px-0 px-4">
                {!isEditMode && (
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="single-permission"
                            checked={isSinglePermission}
                            onCheckedChange={setIsSinglePermission}
                        />
                        <label htmlFor="single-permission" className="text-sm font-medium">
                            Create single permission
                        </label>
                    </div>
                )}
                <div>
                    <label htmlFor="name" className="block text-sm font-medium">
                        {isEditMode ? "Permission Name" : (isSinglePermission ? "Permission Name" : "Base Permission Name")}
                    </label>
                    <Input
                        id="name"
                        name="name"
                        placeholder={isEditMode ? "Permission Name" : (isSinglePermission ? "e.g., manage:users" : "e.g., member")}
                        value={permission.name}
                        onChange={onInputChange}
                    />
                    {!isEditMode && !isSinglePermission && (
                        <p className="mt-2 text-sm text-muted-foreground">
                            This will create: create:{permission.name || '[name]'}, 
                            edit:{permission.name || '[name]'}, 
                            delete:{permission.name || '[name]'}, 
                            list:{permission.name || '[name]'},
                            show:{permission.name || '[name]'}
                        </p>
                    )}
                </div>
            </div>
            <SheetFooter className="flex justify-end gap-2">
                <Button 
                    onClick={() => onCreateOrUpdatePermission(isSinglePermission)} 
                    className="bg-infinity"
                >
                    {isEditMode 
                        ? "Update Permission" 
                        : (isSinglePermission ? "Create Permission" : "Create CRUD Permissions")}
                </Button>
                <SheetClose asChild>
                    <Button variant="outline">Cancel</Button>
                </SheetClose>
            </SheetFooter>
        </SheetContent>
    );
};

