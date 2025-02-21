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
import { Scan } from "lucide-react";

import { UserPersonalTrainer } from "./schema";
import { Button } from "@/components/ui/button";

import { useEffect } from "react";


type TrainerFormProps = {
    newTrainer: UserPersonalTrainer;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCreateOrUpdateTrainer: () => void;
    isEditMode: boolean;
};

export const TrainerForm: React.FC<TrainerFormProps> = ({
    newTrainer,
    onInputChange,
    onCreateOrUpdateTrainer,
    isEditMode,
}) => {
    useEffect(() => {
        console.log("New Trainer Data:", newTrainer); // Debug log
    }, [newTrainer]);

return (
    <SheetContent side="right" className="w-full overflow-y-auto">
        <SheetHeader>
            <SheetTitle>{isEditMode ? "Edit Trainer" : "Create New Trainer"}</SheetTitle>
            <SheetDescription>{isEditMode ? "Edit the trainer details." : "Add a new trainer to the system."}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 py-8 sm:px-0 px-4">
            <div>
            <label htmlFor="name" className="block text-sm font-medium">
                Name
            </label>
            <Input
                id="name"
                name="name"
                placeholder="Name"
                value={isEditMode ? newTrainer.user?.name ?? "" : newTrainer.name ?? ""}
                onChange={onInputChange}
            />
            </div>
            <div>
            <label htmlFor="email" className="block text-sm font-medium">
                Email
            </label>
            <Input
                id="email"
                name="email"
                placeholder="Email"
                value={isEditMode ? newTrainer.user?.email ?? "" : newTrainer.email }
                onChange={onInputChange}
            />
            </div>
            <div>
            <label htmlFor="address" className="block text-sm font-medium">
                Address
            </label>
            <Input
                id="address"
                name="address"
                placeholder="Address"
                value={isEditMode ? newTrainer.user?.address ?? "" : newTrainer.address}
                onChange={onInputChange}
            />
            </div>
            <div>
            <label htmlFor="phone" className="block text-sm font-medium">
                Phone
            </label>
            <Input
                id="phone"
                name="phone"
                placeholder="Phone"
                value={isEditMode ? newTrainer.user?.phone ?? "" : newTrainer.phone}
                onChange={onInputChange}
            />
            </div>
            <div>
            <label htmlFor="birthDate" className="block text-sm font-medium">
                Birth Date
            </label>
            <Input
                id="birthDate"
                name="birthDate"
                type="date"
                value={
                (isEditMode ? newTrainer.user?.birthDate : newTrainer.birthDate) instanceof Date
                    ? ((isEditMode ? newTrainer.user?.birthDate : newTrainer.birthDate) instanceof Date 
                        ? (isEditMode ? newTrainer.user?.birthDate : newTrainer.birthDate)?.toISOString().split("T")[0] 
                        : "")
                    : ""
                }
                onChange={onInputChange}
            />
            </div>
            <div>
            <label htmlFor="idNumber" className="block text-sm font-medium">
                ID Number
            </label>
            <Input
                id="idNumber"
                name="idNumber"
                placeholder="ID Number"
                value={isEditMode ? newTrainer.user?.idNumber ?? "" : newTrainer.idNumber}
                onChange={onInputChange}
            />
            </div>
            <div>
            <label htmlFor="description" className="block text-sm font-medium">
                Description
            </label>
            <Input
                id="description"
                name="description"
                placeholder="Trainer description"
                value={isEditMode ? newTrainer.description ?? "" : newTrainer.description ?? ""}
                onChange={onInputChange}
            />
            </div>
        </div>
        <SheetFooter className="flex justify-end gap-2">
            <Button onClick={onCreateOrUpdateTrainer} className="bg-infinity">
            {isEditMode ? "Update Trainer" : "Create Trainer"}
            </Button>
            <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
            </SheetClose>
        </SheetFooter>
    </SheetContent>
  );
};
