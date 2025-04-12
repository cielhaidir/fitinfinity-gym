"use client";

import { UserEmployee } from "./schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/trpc/react";
import { useState } from "react";

type User = {
    id: string;
    name: string;
    email: string;
    address?: string;
    phone?: string;
    birthDate?: Date;
    idNumber?: string;
};

type EmployeeFormProps = {
    newEmployee: UserEmployee;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSelectUser: (userId: string) => void;
    onCreateOrUpdateEmployee: () => void;
    isEditMode: boolean;
};

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
    newEmployee,
    onInputChange,
    onSelectUser,
    onCreateOrUpdateEmployee,
    isEditMode,
}) => {
    const [search, setSearch] = useState("");
    const [searchColumn, setSearchColumn] = useState("");

    const { data: users = [] } = api.user.list.useQuery({
        page: 1,
        limit: 100,
        search,
        searchColumn,
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onInputChange(e);
    };

    return (
        <SheetContent side="right">
            <SheetHeader>
                <SheetTitle>
                    {isEditMode ? "Edit Employee" : "Create New Employee"}
                </SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-4 py-8">
                <div>
                    <label htmlFor="user" className="block text-sm font-medium">
                        User
                    </label>
                    <Select
                        value={newEmployee.userId}
                        onValueChange={onSelectUser}
                        disabled={isEditMode}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                            {users.items?.map((user: User) => (
                                <SelectItem key={user.id} value={user.id}>
                                    {user.name || 'Unnamed'} - {user.email || 'No email'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label htmlFor="position" className="block text-sm font-medium">
                        Position
                    </label>
                    <Input
                        id="position"
                        name="position"
                        value={newEmployee.position || ""}
                        onChange={handleInputChange}
                        placeholder="Enter position"
                    />
                </div>

                <div>
                    <label htmlFor="department" className="block text-sm font-medium">
                        Department
                    </label>
                    <Input
                        id="department"
                        name="department"
                        value={newEmployee.department || ""}
                        onChange={handleInputChange}
                        placeholder="Enter department"
                    />
                </div>

                <div>
                    <label htmlFor="image" className="block text-sm font-medium">
                        Image URL
                    </label>
                    <Input
                        id="image"
                        name="image"
                        value={newEmployee.image || ""}
                        onChange={handleInputChange}
                        placeholder="Enter image URL"
                    />
                </div>
            </div>

            <SheetFooter>
                <Button
                    type="button"
                    onClick={onCreateOrUpdateEmployee}
                    className="bg-infinity"
                    disabled={!newEmployee.userId}
                >
                    {isEditMode ? "Update" : "Create"} Employee
                </Button>
            </SheetFooter>
        </SheetContent>
    );
}; 