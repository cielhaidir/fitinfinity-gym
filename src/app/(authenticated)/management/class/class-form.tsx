"use client"

import {
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { api } from "@/trpc/react"
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"

type ClassFormProps = {
    name: string;
    limit: number | null;
    trainerId: string;
    onNameChange: (name: string) => void;
    onLimitChange: (limit: number | null) => void;
    onTrainerChange: (trainerId: string) => void;
    onCreateOrUpdateClass: () => void;
    isEditMode: boolean;
};

export const ClassForm = ({
    name,
    limit,
    trainerId,
    onNameChange,
    onLimitChange,
    onTrainerChange,
    onCreateOrUpdateClass,
    isEditMode,
}: ClassFormProps) => {
    // Local state
    const [localName, setLocalName] = useState(name);
    const [localLimit, setLocalLimit] = useState<number | null>(limit);
    const [localTrainerId, setLocalTrainerId] = useState(trainerId);

    // Update local state when props change
    useEffect(() => {
        setLocalName(name);
        setLocalLimit(limit);
        setLocalTrainerId(trainerId);
    }, [name, limit, trainerId]);

    // Handle local changes and propagate to parent
    const handleNameChange = (value: string) => {
        setLocalName(value);
        onNameChange(value);
    };

    const handleLimitChange = (value: string) => {
        const newLimit = value ? parseInt(value) : null;
        setLocalLimit(newLimit);
        onLimitChange(newLimit);
    };

    const handleTrainerChange = (value: string) => {
        setLocalTrainerId(value);
        onTrainerChange(value);
    };

    const { data: trainers } = api.personalTrainer.list.useQuery(
        { page: 1, limit: 100 },
        { 
            suspense: false,
            staleTime: 5000, // Add stale time to prevent frequent refetches
        }
    );

    return (
        <SheetContent side="right">
            <SheetHeader>
                <SheetTitle>
                    {isEditMode ? "Edit Class" : "Create New Class"}
                </SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-4 py-8">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium">
                        Class Name
                    </label>
                    <Input
                        id="name"
                        value={localName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Enter class name"
                    />
                </div>

                <div>
                    <label htmlFor="limit" className="block text-sm font-medium">
                        Student Limit
                    </label>
                    <Input
                        type="number"
                        id="limit"
                        value={localLimit ?? ""}
                        onChange={(e) => handleLimitChange(e.target.value)}
                        placeholder="Enter student limit"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium">
                        Trainer
                    </label>
                    <Select
                        value={localTrainerId}
                        onValueChange={handleTrainerChange}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a trainer" />
                        </SelectTrigger>
                        <SelectContent>
                            {trainers?.items.map((trainer) => (
                                <SelectItem
                                    key={trainer.id}
                                    value={trainer.id}
                                >
                                    {trainer.user.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <SheetFooter>
                <Button
                    type="button"
                    onClick={onCreateOrUpdateClass}
                    className="bg-infinity"
                    disabled={!localName || !localTrainerId}
                >
                    {isEditMode ? "Update" : "Create"} Class
                </Button>
            </SheetFooter>
        </SheetContent>
    );
}; 