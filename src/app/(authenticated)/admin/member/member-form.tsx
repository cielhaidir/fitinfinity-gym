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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { type UserMember } from "./schema";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";

type MemberFormProps = {
  newMember: UserMember | null;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdate: () => void;
  onCancel: () => void;
  isAddMode?: boolean;
};

export const MemberForm: React.FC<MemberFormProps> = ({
  newMember,
  onInputChange,
  onUpdate,
  onCancel,
  isAddMode = false,
}) => {
  const { data: fcs } = api.fc.list.useQuery({
    page: 1,
    limit: 100,
    search: "",
    searchColumn: "",
  });
  const { data: pts } = api.personalTrainer.list.useQuery({
    page: 1,
    limit: 100,
    search: "",
    searchColumn: "",
  });

  if (!newMember) return null;

  return (
    <SheetContent side="right" className="w-full overflow-y-auto">
      <SheetHeader>
        <SheetTitle>{isAddMode ? "Tambah Member" : "Edit Member"}</SheetTitle>
        <SheetDescription>
          {isAddMode ? "Masukkan data member baru." : "Update the member's information."}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-4 py-8 sm:px-0">
        <div className="md:col-span-2">
          <label htmlFor="rfidNumber" className="block text-sm font-medium">
            RFID Number
          </label>
          <Input
            id="rfidNumber"
            name="rfidNumber"
            placeholder="RFID Number"
            value={newMember.rfidNumber ?? ""}
            onChange={onInputChange}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="fcId" className="block text-sm font-medium">
            Fitness Consultant
          </label>
          <Select
            value={newMember.fcId ?? "none"}
            onValueChange={(value) => {
              onInputChange({
                target: {
                  name: "fcId",
                  value: value === "none" ? null : value,
                },
              } as React.ChangeEvent<HTMLInputElement>);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select FC" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {fcs?.items.map((fc) => (
                <SelectItem key={fc.id} value={fc.id}>
                  {fc.user?.name || "Unnamed FC"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="personalTrainerId"
            className="block text-sm font-medium"
          >
            Personal Trainer
          </label>
          <Select
            value={newMember.personalTrainerId ?? "none"}
            onValueChange={(value) => {
              onInputChange({
                target: {
                  name: "personalTrainerId",
                  value: value === "none" ? null : value,
                },
              } as React.ChangeEvent<HTMLInputElement>);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select PT" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {pts?.items.map((pt) => (
                <SelectItem key={pt.id} value={pt.id}>
                  {pt.user?.name || "Unnamed PT"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <SheetFooter className="flex justify-end gap-2">
        <Button onClick={onUpdate} className="bg-infinity">
          {isAddMode ? "Tambah Member" : "Update Member"}
        </Button>
        <SheetClose asChild>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </SheetClose>
      </SheetFooter>
    </SheetContent>
  );
};
