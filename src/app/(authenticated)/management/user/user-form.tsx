"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { api } from "@/trpc/react";

import { Badge } from "@/components/ui/badge";
import { X, Check, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserFormProps {
  user: any;
  onSubmit: (data: any) => void;
  isEditMode: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({
  user,
  onSubmit,
  isEditMode,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    address: "",
    phone: "",
    birthDate: "",
    idNumber: "",
    roleIds: [] as string[],
  });

  const { data: roles = [] } = api.role.listAll.useQuery({
    search: "",
  });

  useEffect(() => {
    if (user && isEditMode) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: "",
        address: user.address || "",
        phone: user.phone || "",
        birthDate:
          (user.birthDate
            ? new Date(user.birthDate).toISOString().split("T")[0]
            : "") || "",
        idNumber: user.idNumber || "",
        roleIds: user.roles?.map((role: any) => role.id) || [],
      });
    }
  }, [user, isEditMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleRoleToggle = (roleId: string) => {
    setFormData((prev) => {
      const roleIds = [...prev.roleIds];
      const index = roleIds.indexOf(roleId);

      if (index === -1) {
        // Add role if not already selected
        roleIds.push(roleId);
      } else {
        // Remove role if already selected
        roleIds.splice(index, 1);
      }

      return {
        ...prev,
        roleIds,
      };
    });
  };

  return (
    <SheetContent side="right" className="w-full overflow-y-auto">
      <SheetHeader>
        <SheetTitle>{isEditMode ? "Edit User" : "Create New User"}</SheetTitle>
      </SheetHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-8">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Name
          </label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
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
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </div>

        {!isEditMode && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleInputChange}
                required={!isEditMode}
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
        )}

        <div>
          <label htmlFor="address" className="block text-sm font-medium">
            Address
          </label>
          <Input
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium">
            Phone
          </label>
          <Input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
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
            value={formData.birthDate}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <label htmlFor="idNumber" className="block text-sm font-medium">
            ID Number
          </label>
          <Input
            id="idNumber"
            name="idNumber"
            value={formData.idNumber}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Roles</label>
          <div className="mb-2 flex flex-wrap gap-1">
            {formData.roleIds.map((roleId) => {
              const role = roles.find((r) => r.id === roleId);
              return role ? (
                <Badge key={role.id} variant="secondary" className="mb-1 mr-1">
                  {role.name}
                  <button
                    type="button"
                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onClick={() => handleRoleToggle(role.id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null;
            })}
          </div>
          <div className="rounded-md border p-2">
            <div className="max-h-[200px] overflow-y-auto">
              {roles.map((role) => {
                const isSelected = formData.roleIds.includes(role.id);
                return (
                  <div
                    key={role.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent",
                      isSelected && "bg-accent",
                    )}
                    onClick={() => handleRoleToggle(role.id)}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span>{role.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button type="submit" className="bg-infinity">
            {isEditMode ? "Update" : "Create"} User
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
};
