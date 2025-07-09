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
} from "@/components/ui/select";
import { Scan } from "lucide-react";

import { type Package, PackageTypeEnum, GroupPriceTypeEnum } from "./schema";
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
    // Reset day and sessions when type changes
    const dayEvent = {
      target: {
        name: "day",
        value: "",
      },
    } as React.ChangeEvent<HTMLInputElement>;

    const sessionsEvent = {
      target: {
        name: "sessions",
        value: "",
      },
    } as React.ChangeEvent<HTMLInputElement>;

    // Reset group-specific fields when type changes
    const isGroupPackageEvent = {
      target: {
        name: "isGroupPackage",
        value: false,
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    const maxUsersEvent = {
      target: {
        name: "maxUsers",
        value: "",
      },
    } as React.ChangeEvent<HTMLInputElement>;

    const groupPriceTypeEvent = {
      target: {
        name: "groupPriceType",
        value: "",
      },
    } as React.ChangeEvent<HTMLInputElement>;

    // Reset all fields
    onInputChange(dayEvent);
    onInputChange(sessionsEvent);
    onInputChange(isGroupPackageEvent);
    onInputChange(maxUsersEvent);
    onInputChange(groupPriceTypeEvent);

    // Then set the new type
    const typeEvent = {
      target: {
        name: "type",
        value: value,
      },
    } as React.ChangeEvent<HTMLInputElement>;

    onInputChange(typeEvent);
  };

  useEffect(() => {
    console.log("New Package Data:", newPackage); // Debug log
  }, [newPackage]);

  return (
    <SheetContent side="right" className="w-full overflow-y-auto">
      <SheetHeader>
        <SheetTitle>
          {isEditMode ? "Edit Package" : "Create New Package"}
        </SheetTitle>
        <SheetDescription>
          {isEditMode
            ? "Edit the package details."
            : "Add a new package to the system."}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-4 py-8 sm:px-0">
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
                <SelectItem value="PERSONAL_TRAINER">
                  Personal Trainer
                </SelectItem>
                <SelectItem value="GROUP_TRAINING">
                  Group Training
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {newPackage.type === "GYM_MEMBERSHIP" && (
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

        {(newPackage.type === "PERSONAL_TRAINER" || newPackage.type === "GROUP_TRAINING") && (
          <>
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
            <div>
              <label htmlFor="day" className="block text-sm font-medium">
                Validity Period (Days)
              </label>
              <Input
                id="day"
                name="day"
                type="number"
                placeholder="Number of days until sessions expire"
                value={newPackage.day ?? ""}
                onChange={onInputChange}
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Sessions will expire after this period
              </p>
            </div>
          </>
        )}

        {newPackage.type === "GROUP_TRAINING" && (
          <>
          
            {/* <div>
              <label htmlFor="isGroupPackage" className="block text-sm font-medium">
                Group Package
              </label>
              <Select
                value={newPackage.isGroupPackage ? "true" : "false"}
                onValueChange={(value) => {
                  onInputChange({
                    target: {
                      name: "isGroupPackage",
                      value: value === "true",
                    },
                  } as unknown as React.ChangeEvent<HTMLInputElement>);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select group package type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="true">Group Package</SelectItem>
                    <SelectItem value="false">Individual Package</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div> */}

                <div>
                  <label htmlFor="maxUsers" className="block text-sm font-medium">
                    Maximum Users
                  </label>
                  <Input
                    id="maxUsers"
                    name="maxUsers"
                    type="number"
                    placeholder="Maximum number of users in group"
                    value={newPackage.maxUsers ?? ""}
                    onChange={onInputChange}
                    min="2"
                    max="20"
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Minimum 2, maximum 20 users per group
                  </p>
                </div>
                
                <div>
                  <label htmlFor="groupPriceType" className="block text-sm font-medium">
                    Group Pricing Type
                  </label>
                  <Select
                    value={newPackage.groupPriceType ?? ""}
                    onValueChange={(value) => {
                      onInputChange({
                        target: {
                          name: "groupPriceType",
                          value: value,
                        },
                      } as React.ChangeEvent<HTMLInputElement>);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pricing type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="TOTAL">Total Price (Split among members)</SelectItem>
                        <SelectItem value="PER_PERSON">Per Person (Each pays full price)</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {newPackage.groupPriceType === "TOTAL" 
                      ? "The total price will be split equally among all group members"
                      : "Each member pays the full package price"}
                  </p>
                </div>
          </>
        )}

        <div>
          <label htmlFor="price" className="block text-sm font-medium">
            Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              Rp
            </span>
            <Input
              id="price"
              name="price"
              placeholder="Price"
              type="number"
              value={newPackage.price}
              onChange={onInputChange}
              className="pl-8"
            />
          </div>
        </div>

        <div>
          <label htmlFor="point" className="block text-sm font-medium">
            Points
          </label>
          <Input
            id="point"
            name="point"
            placeholder="Points reward for this package"
            type="number"
            value={newPackage.point ?? 0}
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
                  name: "isActive",
                  value: value === "true",
                },
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
