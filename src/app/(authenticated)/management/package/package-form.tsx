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
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Scan } from "lucide-react";

import { Package, PackageTypeEnum } from "./schema";
import { Button } from "@/components/ui/button";

import { useEffect } from "react";


type PackageFormProps = {
    newPackage: Package;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCreateOrUpdatePackage: () => void;
    isEditMode: boolean;
};

export const PackageForm: React.FC<PackageFormProps> = ({
    newPackage,
    onInputChange,
    onCreateOrUpdatePackage,
    isEditMode,
}) => {
    const handleTypeChange = (value: string) => {
        const event = {
            target: {
                name: 'type',
                value: value
            }
        } as React.ChangeEvent<HTMLInputElement>;

        onInputChange(event);
    };

    useEffect(() => {
        console.log("New Member Data:", newPackage); // Debug log
    }, [newPackage]);

    return (
        <SheetContent side="right" className="w-full overflow-y-auto">
            <SheetHeader>
                <SheetTitle>{isEditMode ? "Edit Package" : "Create New Package"}</SheetTitle>
                <SheetDescription>{isEditMode ? "Edit the package details." : "Add a new package to the system."}</SheetDescription>
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
                        value={newPackage.name ?? ""}
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
                        placeholder="Description"
                        value={newPackage.description ?? ""}
                        onChange={onInputChange}
                    />
                </div>

                <div>
                    <label htmlFor="type" className="block text-sm font-medium">
                        Package Type
                    </label>
                    <Select value={newPackage.type} onValueChange={handleTypeChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select package type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="GYM_MEMBERSHIP">Gym Membership</SelectItem>
                                <SelectItem value="PERSONAL_TRAINER">Personal Trainer</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

                {newPackage.type === 'GYM_MEMBERSHIP' && (
                    <div>
                        <label htmlFor="day" className="block text-sm font-medium">
                            Days
                        </label>
                        <Input
                            id="day"
                            name="day"
                            type="number"
                            placeholder="Number of days"
                            value={newPackage.day ?? ""}
                            onChange={onInputChange}
                        />
                    </div>
                )}

                {newPackage.type === 'PERSONAL_TRAINER' && (
                    <div>
                        <label htmlFor="sessions" className="block text-sm font-medium">
                            Sessions
                        </label>
                        <Input
                            id="sessions"
                            name="sessions"
                            type="number"
                            placeholder="Number of sessions"
                            value={newPackage.sessions ?? ""}
                            onChange={onInputChange}
                        />
                    </div>
                )}

                <div>
                    <label htmlFor="reward" className="block text-sm font-medium">
                        Reward
                    </label>
                    <Input
                        id="reward"
                        name="reward"
                        placeholder="Point reward for this package"
                        type="number"
                        value={newPackage.reward ?? ""}
                        onChange={onInputChange}
                    />
                </div>

                <div>
                    <label htmlFor="price" className="block text-sm font-medium">
                        Price
                    </label>
                    <Input
                        id="price"
                        name="price"
                        placeholder="Price"
                        type="number"
                        value={newPackage.price}
                        onChange={onInputChange}
                    />
                </div>

                <div>
                    <label htmlFor="isActive" className="block text-sm font-medium">
                        Status
                    </label>
                    <Select 
                        value={newPackage.isActive ? "true" : "false"}
                        onValueChange={(value) => {
                            onInputChange({
                                target: {
                                    name: 'isActive',
                                    value: value === "true"
                                }
                            } as unknown as React.ChangeEvent<HTMLInputElement>);
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="true">Active</SelectItem>
                                <SelectItem value="false">Inactive</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

            </div>
            <SheetFooter className="flex justify-end gap-2">
                <Button onClick={onCreateOrUpdatePackage} className="bg-infinity">
                    {isEditMode ? "Update Package" : "Create Package"}
                </Button>
                <SheetClose asChild>
                    <Button variant="outline">Cancel</Button>
                </SheetClose>
            </SheetFooter>
        </SheetContent>
    );
};
