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

type MemberFormProps = {
    newMember: UserMember | null;
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
    if (!newMember) return null;

    return (
        <SheetContent side="right" className="w-full overflow-y-auto">
            <SheetHeader>
                <SheetTitle>Edit Member RFID</SheetTitle>
                <SheetDescription>Update the member's RFID number.</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 py-8 sm:px-0 px-4">
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
                    Update RFID
                </Button>
                <SheetClose asChild>
                    <Button variant="outline">Cancel</Button>
                </SheetClose>
            </SheetFooter>
        </SheetContent>
    );
};
