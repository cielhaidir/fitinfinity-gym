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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/trpc/react";
import { Class } from "./schema";

type ClassFormProps = {
    classData: Class;
    onInputChange: (name: string, value: string | number) => void;
    onCreateOrUpdateClass: () => void;
    isEditMode: boolean;
};

export const ClassForm: React.FC<ClassFormProps> = ({
    classData,
    onInputChange,
    onCreateOrUpdateClass,
    isEditMode,
}) => {
    const { data: trainers = [] } = api.class.getTrainers.useQuery();

    return (
        <SheetContent side="right" className="w-full overflow-y-auto">
            <SheetHeader>
                <SheetTitle>{isEditMode ? "Edit Class" : "Create New Class"}</SheetTitle>
                <SheetDescription>
                    {isEditMode ? "Edit the class details." : "Add a new class to the system."}
                </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 py-8 sm:px-0 px-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium">
                        Class Name
                    </label>
                    <Input
                        id="name"
                        name="name"
                        placeholder="Class Name"
                        value={classData.name}
                        onChange={(e) => onInputChange("name", e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="limit" className="block text-sm font-medium">
                        Member Limit
                    </label>
                    <Input
                        id="limit"
                        name="limit"
                        type="number"
                        placeholder="Member Limit"
                        value={classData.limit}
                        onChange={(e) => onInputChange("limit", parseInt(e.target.value))}
                    />
                </div>
                <div>
                    <label htmlFor="price" className="block text-sm font-medium">
                        Price
                    </label>
                    <Input
                        id="price"
                        name="price"
                        type="number"
                        placeholder="Price"
                        value={classData.price}
                        onChange={(e) => onInputChange("price", parseInt(e.target.value))}
                    />
                </div>
                <div>
                    <label htmlFor="trainer" className="block text-sm font-medium">
                        Trainer
                    </label>
                    <Select 
                        value={classData.id_employee} 
                        onValueChange={(value) => onInputChange("id_employee", value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a trainer" />
                        </SelectTrigger>
                        <SelectContent>
                            {trainers.map((trainer) => (
                                <SelectItem key={trainer.id} value={trainer.id}>
                                    {trainer.user.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <SheetFooter className="flex justify-end gap-2">
                <Button onClick={onCreateOrUpdateClass} className="bg-infinity">
                    {isEditMode ? "Update Class" : "Create Class"}
                </Button>
                <SheetClose asChild>
                    <Button variant="outline">Cancel</Button>
                </SheetClose>
            </SheetFooter>
        </SheetContent>
    );
};
