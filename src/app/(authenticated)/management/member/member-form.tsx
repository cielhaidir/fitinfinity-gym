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

import { UserMember } from "./schema";
import { Button } from "@/components/ui/button";

import { useEffect } from "react";


type MemberFormProps = {
    newMember: UserMember;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onScanRFID: () => void;
    onCreateOrUpdateMember: () => void;
    isEditMode: boolean;
};

export const MemberForm: React.FC<MemberFormProps> = ({
    newMember,
    onInputChange,
    onScanRFID,
    onCreateOrUpdateMember,
    isEditMode,
}) => {
    useEffect(() => {
        console.log("New Member Data:", newMember); // Debug log
    }, [newMember]);

return (
    <SheetContent side="right" className="w-full overflow-y-auto">
        <SheetHeader>
            <SheetTitle>{isEditMode ? "Edit Member" : "Create New Member"}</SheetTitle>
            <SheetDescription>{isEditMode ? "Edit the member details." : "Add a new member to the system."}</SheetDescription>
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
                value={isEditMode ? newMember.user?.name ?? "" : newMember.name ?? ""}
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
                value={isEditMode ? newMember.user?.email ?? "" : newMember.email }
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
                value={isEditMode ? newMember.user?.address ?? "" : newMember.address}
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
                value={isEditMode ? newMember.user?.phone ?? "" : newMember.phone}
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
                (isEditMode ? newMember.user?.birthDate : newMember.birthDate) instanceof Date
                    ? ((isEditMode ? newMember.user?.birthDate : newMember.birthDate) instanceof Date 
                        ? (isEditMode ? newMember.user?.birthDate : newMember.birthDate)?.toISOString().split("T")[0] 
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
                value={isEditMode ? newMember.user?.idNumber ?? "" : newMember.idNumber}
                onChange={onInputChange}
            />
            </div>
            <div className="md:col-span-2">
            <label htmlFor="rfidNumber" className="block text-sm font-medium">
                RFID Number
            </label>
            <div className="flex space-x-2">
                <Input
                id="rfidNumber"
                name="rfidNumber"
                placeholder="RFID Number"
                value={newMember.rfidNumber ?? ""}
                onChange={onInputChange}
                />
                <Button
                onClick={onScanRFID}
                className="whitespace-nowrap bg-infinity"
                >
                <Scan className="mr-2 h-4 w-4" /> Scan RFID
                </Button>
            </div>
            </div>
        </div>
        <SheetFooter className="flex justify-end gap-2">
            <Button onClick={onCreateOrUpdateMember} className="bg-infinity">
            {isEditMode ? "Update Member" : "Create Member"}
            </Button>
            <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
            </SheetClose>
        </SheetFooter>
    </SheetContent>
  );
};
