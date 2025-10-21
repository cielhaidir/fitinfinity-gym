"use client";

import { type UserEmployee } from "./schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EnrollmentStatus } from "@prisma/client";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { api } from "@/trpc/react";
import { useState } from "react";
import { toast } from "sonner";
import { DeviceSelect } from "./device-select";
import { Eye, EyeOff } from "lucide-react";

type EmployeeFormProps = {
  newEmployee: UserEmployee & {
    id?: string;
    enrollmentStatus?: "PENDING" | "ENROLLED" | "FAILED" | null;
    fingerprintId?: number | null;
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreateOrUpdateEmployee: () => Promise<void>;
  isEditMode: boolean;
  isLoading?: boolean;
};

export const EmployeeForm = ({
  newEmployee,
  onInputChange,
  onCreateOrUpdateEmployee,
  isEditMode,
  isLoading = false,
}: EmployeeFormProps) => {
  const [selectedDevice, setSelectedDevice] = useState<{ id: string; accessKey: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  // Helper function to format date for input
  const formatDateForInput = (date: Date | string | null | undefined) => {
    if (!date) return "";
    if (typeof date === "string") {
      return date.split("T")[0];
    }
    return date.toISOString().split("T")[0];
  };

  const requestEnrollMutation = api.esp32.requestEnrollment.useMutation({
    onSuccess: () => {
      toast.success("Fingerprint enrollment initiated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEnrollmentRequest = () => {
    // if (!newEmployee.id || !selectedDevice) {
    //   toast.error("Please select a device first");
    //   return;
    // }
    if (!newEmployee.id ) {
      toast.error("Please select a employee");
      return;
    }
    requestEnrollMutation.mutate({
      employeeId: newEmployee.id,
      // deviceId: selectedDevice.id,
      // accessKey: selectedDevice.accessKey
    });
  };

  return (
    <SheetContent side="right" className="w-full overflow-y-auto">
      <SheetHeader>
        <SheetTitle>
          {isEditMode ? "Edit Employee" : "Create New Employee"}
        </SheetTitle>
      </SheetHeader>

      <div className="flex flex-col gap-4 py-8">
        {isEditMode && (
          <div className="border rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium mb-2">Fingerprint Status</h3>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={newEmployee.enrollmentStatus ?
                (newEmployee.enrollmentStatus === "ENROLLED" ? "default" :
                 newEmployee.enrollmentStatus === "PENDING" ? "outline" : "destructive") :
                "secondary"}>
                {newEmployee.enrollmentStatus || "Not Enrolled"}
              </Badge>
              {newEmployee.fingerprintId && (
                <span className="text-sm text-muted-foreground">
                  ID: {newEmployee.fingerprintId}
                </span>
              )}
            </div>
            {!newEmployee.enrollmentStatus || newEmployee.enrollmentStatus === "FAILED" ? (
              <div className="space-y-2">
                {/* <DeviceSelect
                  onSelect={setSelectedDevice}
                  disabled={requestEnrollMutation.isPending}
                /> */}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleEnrollmentRequest}
                  // disabled={requestEnrollMutation.isPending || !selectedDevice}
                  disabled={requestEnrollMutation.isPending }
                  className="w-full"
                >
                  Enroll Fingerprint
                </Button>
              </div>
            ) : newEmployee.enrollmentStatus === "PENDING" && (
              <span className="text-sm text-muted-foreground">
                Waiting for device confirmation...
              </span>
            )}
          </div>
        )}
        {!isEditMode ? (
          <>
            <div>
              <label htmlFor="name" className="block text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                name="name"
                value={newEmployee.name}
                onChange={onInputChange}
                placeholder="Enter name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={newEmployee.email}
                onChange={onInputChange}
                placeholder="Enter email"
                disabled={isEditMode}
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
                  value={newEmployee.password}
                  onChange={onInputChange}
                  placeholder="Enter password"
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
              <label htmlFor="position" className="block text-sm font-medium">
                Position
              </label>
              <Input
                id="position"
                name="position"
                value={newEmployee.position || ""}
                onChange={onInputChange}
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
                onChange={onInputChange}
                placeholder="Enter department"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium">
                Address
              </label>
              <Input
                id="address"
                name="address"
                value={newEmployee.address || ""}
                onChange={onInputChange}
                placeholder="Enter address"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium">
                Phone
              </label>
              <Input
                id="phone"
                name="phone"
                value={newEmployee.phone || ""}
                onChange={onInputChange}
                placeholder="Enter phone"
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
                value={formatDateForInput(newEmployee.birthDate)}
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
                value={newEmployee.idNumber || ""}
                onChange={onInputChange}
                placeholder="Enter ID number"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="name" className="block text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                name="name"
                value={newEmployee.name}
                onChange={onInputChange}
                placeholder="Enter name"
              />
            </div>

            <div>
              <label htmlFor="position" className="block text-sm font-medium">
                Position
              </label>
              <Input
                id="position"
                name="position"
                value={newEmployee.position || ""}
                onChange={onInputChange}
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
                onChange={onInputChange}
                placeholder="Enter department"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium">
                Phone
              </label>
              <Input
                id="phone"
                name="phone"
                value={newEmployee.phone || ""}
                onChange={onInputChange}
                placeholder="Enter phone"
              />
            </div>

            <div>
              <label htmlFor="idNumber" className="block text-sm font-medium">
                ID Number
              </label>
              <Input
                id="idNumber"
                name="idNumber"
                value={newEmployee.idNumber || ""}
                onChange={onInputChange}
                placeholder="Enter ID number"
              />
            </div>
          </>
        )}
      </div>

      <SheetFooter>
        <Button
          type="button"
          onClick={onCreateOrUpdateEmployee}
          className="bg-infinity"
          disabled={isLoading || requestEnrollMutation.isPending}
        >
          {isLoading ? "Saving..." : isEditMode ? "Update" : "Create"} Employee
        </Button>
      </SheetFooter>
    </SheetContent>
  );
};
