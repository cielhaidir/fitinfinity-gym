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
import { Role } from "./schema";

type RoleFormProps = {
    role: Role;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCreateOrUpdateRole: () => void;
    isEditMode: boolean;
};

export const RoleForm: React.FC<RoleFormProps> = ({
    role,
    onInputChange,
    onCreateOrUpdateRole,
    isEditMode,
}) => {
    return (
        <SheetContent side="right" className="w-full overflow-y-auto">
            <SheetHeader>
                <SheetTitle>
                    {isEditMode ? "Edit Role" : "Create New Role"}
                </SheetTitle>
                <SheetDescription>
                    {isEditMode
                        ? "Edit the role name."
                        : "Add a new role to the system."}
                </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 py-8 sm:px-0 px-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium">
                        Role Name
                    </label>
                    <Input
                        id="name"
                        name="name"
                        placeholder="Role Name"
                        value={role.name}
                        onChange={onInputChange}
                    />
                </div>
            </div>
            <SheetFooter className="flex justify-end gap-2">
                <Button onClick={onCreateOrUpdateRole} className="bg-infinity">
                    {isEditMode ? "Update Role" : "Create Role"}
                </Button>
                <SheetClose asChild>
                    <Button variant="outline">Cancel</Button>
                </SheetClose>
            </SheetFooter>
        </SheetContent>
    );
};
