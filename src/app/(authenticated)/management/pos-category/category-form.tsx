"use client";

import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { POSCategory } from "./schema";

interface CategoryFormProps {
  newCategory: POSCategory;
  onCreateOrUpdateCategory: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSwitchChange: (checked: boolean) => void;
  isEditMode: boolean;
}

export function CategoryForm({
  newCategory,
  onCreateOrUpdateCategory,
  onInputChange,
  onSwitchChange,
  isEditMode,
}: CategoryFormProps) {
  return (
    <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
      <SheetHeader>
        <SheetTitle>
          {isEditMode ? "Edit Category" : "Create New Category"}
        </SheetTitle>
      </SheetHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Name *
          </Label>
          <Input
            id="name"
            name="name"
            value={newCategory.name}
            onChange={onInputChange}
            className="col-span-3"
            placeholder="Enter category name"
          />
        </div>
        
        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="description" className="text-right pt-2">
            Description
          </Label>
          <Textarea
            id="description"
            name="description"
            value={newCategory.description || ""}
            onChange={onInputChange}
            className="col-span-3"
            placeholder="Enter category description"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="isActive" className="text-right">
            Active
          </Label>
          <div className="col-span-3">
            <Switch
              id="isActive"
              checked={newCategory.isActive}
              onCheckedChange={onSwitchChange}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            onClick={onCreateOrUpdateCategory}
            className="bg-infinity hover:bg-infinity/90"
          >
            {isEditMode ? "Update Category" : "Create Category"}
          </Button>
        </div>
      </div>
    </SheetContent>
  );
}