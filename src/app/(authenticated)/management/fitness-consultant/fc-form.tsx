"use client";

import { Input } from "@/components/ui/input";
import {
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

import { type UserFC } from "./schema";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

import { useEffect, useState } from "react";

type FCFormProps = {
  newFC: UserFC;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreateOrUpdateFC: () => void;
  isEditMode: boolean;
  selectedUserId?: string | null;
};

export const FCForm: React.FC<FCFormProps> = ({
  newFC,
  onInputChange,
  onCreateOrUpdateFC,
  isEditMode,
  selectedUserId,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    console.log("New FC Data:", newFC); // Debug log
  }, [newFC]);

  return (
    <SheetContent side="right" className="w-full overflow-y-auto">
      <SheetHeader>
        <SheetTitle>
          {isEditMode
            ? "Edit FC"
            : selectedUserId
              ? "Create New FC"
              : "Create New User & FC"}
        </SheetTitle>
        <SheetDescription>
          {isEditMode
            ? "Edit the FC details."
            : selectedUserId
              ? "Create a new FC with the selected user."
              : "Add a new user and FC to the system."}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 py-8">
        {!selectedUserId && !isEditMode && (
          <>
            <div>
              <label htmlFor="name" className="block text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                name="name"
                placeholder="Name"
                value={newFC.name ?? ""}
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
                value={newFC.email}
                onChange={onInputChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={newFC.password}
                  onChange={onInputChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium">
                Address
              </label>
              <Input
                id="address"
                name="address"
                placeholder="Address"
                value={newFC.address}
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
                value={newFC.phone}
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
                  newFC.birthDate instanceof Date
                    ? newFC.birthDate.toISOString().split("T")[0]
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
                value={newFC.idNumber}
                onChange={onInputChange}
              />
            </div>
          </>
        )}
        {(isEditMode || selectedUserId) && (
          <>
            <div>
              <label htmlFor="name" className="block text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                name="name"
                placeholder="Name"
                value={
                  isEditMode ? (newFC.user?.name ?? "") : (newFC.name ?? "")
                }
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
                value={isEditMode ? (newFC.user?.phone ?? "") : newFC.phone}
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
                value={
                  isEditMode ? (newFC.user?.idNumber ?? "") : newFC.idNumber
                }
                onChange={onInputChange}
              />
            </div>
          </>
        )}
      </div>
      <SheetFooter>
        <Button onClick={onCreateOrUpdateFC} className="bg-infinity">
          {isEditMode ? "Update FC" : "Create FC"}
        </Button>
        <SheetClose asChild>
          <Button variant="outline">Cancel</Button>
        </SheetClose>
      </SheetFooter>
    </SheetContent>
  );
};
