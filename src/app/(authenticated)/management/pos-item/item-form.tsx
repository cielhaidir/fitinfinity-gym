"use client";

import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/trpc/react";
import type { POSItem } from "./schema";

interface ItemFormProps {
  newItem: POSItem & { category?: { name: string } };
  onCreateOrUpdateItem: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSelectChange: (value: string) => void;
  onSwitchChange: (checked: boolean) => void;
  isEditMode: boolean;
}

export function ItemForm({
  newItem,
  onCreateOrUpdateItem,
  onInputChange,
  onSelectChange,
  onSwitchChange,
  isEditMode,
}: ItemFormProps) {
  const { data: categories } = api.posCategory.getAll.useQuery();

  return (
    <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
      <SheetHeader>
        <SheetTitle>
          {isEditMode ? "Edit Item" : "Create New Item"}
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
            value={newItem.name}
            onChange={onInputChange}
            className="col-span-3"
            placeholder="Enter item name"
          />
        </div>
        
        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="description" className="text-right pt-2">
            Description
          </Label>
          <Textarea
            id="description"
            name="description"
            value={newItem.description || ""}
            onChange={onInputChange}
            className="col-span-3"
            placeholder="Enter item description"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="categoryId" className="text-right">
            Category *
          </Label>
          <div className="col-span-3">
            <Select value={newItem.categoryId} onValueChange={onSelectChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="price" className="text-right">
            Price *
          </Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            value={newItem.price}
            onChange={onInputChange}
            className="col-span-3"
            placeholder="0.00"
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="cost" className="text-right">
            Cost
          </Label>
          <Input
            id="cost"
            name="cost"
            type="number"
            step="0.01"
            min="0"
            value={newItem.cost || ""}
            onChange={onInputChange}
            className="col-span-3"
            placeholder="0.00"
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="stock" className="text-right">
            Stock
          </Label>
          <Input
            id="stock"
            name="stock"
            type="number"
            min="0"
            value={newItem.stock}
            onChange={onInputChange}
            className="col-span-3"
            placeholder="0"
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="minStock" className="text-right">
            Min Stock
          </Label>
          <Input
            id="minStock"
            name="minStock"
            type="number"
            min="0"
            value={newItem.minStock || ""}
            onChange={onInputChange}
            className="col-span-3"
            placeholder="0"
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="isActive" className="text-right">
            Active
          </Label>
          <div className="col-span-3">
            <Switch
              id="isActive"
              checked={newItem.isActive}
              onCheckedChange={onSwitchChange}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            onClick={onCreateOrUpdateItem}
            className="bg-infinity hover:bg-infinity/90"
          >
            {isEditMode ? "Update Item" : "Create Item"}
          </Button>
        </div>
      </div>
    </SheetContent>
  );
}