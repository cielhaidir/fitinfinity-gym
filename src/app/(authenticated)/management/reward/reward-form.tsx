"use client";

import { Input } from "@/components/ui/input";
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { type Reward } from "./schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DynamicIcon from "./component/dynamic-icon";
import {
  Gift,
  Award,
  Badge,
  Crown,
  Star,
  Heart,
  Trophy,
  Gem,
  Ticket,
  Zap,
  Coffee,
  Shirt,
  Smartphone,
  Headphones,
  Book,
} from "lucide-react";

type RewardFormProps = {
  reward: Partial<Reward>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
  onCreateOrUpdateReward: () => void;
  isEditMode: boolean;
};

const iconMap = {
  Gift,
  Award,
  Badge,
  Crown,
  Star,
  Heart,
  Trophy,
  Gem,
  Ticket,
  Zap,
  Coffee,
  Shirt,
  Smartphone,
  Headphones,
  Book,
};

export const RewardForm: React.FC<RewardFormProps> = ({
  reward,
  onInputChange,
  onSelectChange,
  onCreateOrUpdateReward,
  isEditMode,
}) => {
  return (
    <SheetContent side="right" className="w-full sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>
          {isEditMode ? "Edit Reward" : "Create New Reward"}
        </SheetTitle>
        <SheetDescription>
          {isEditMode
            ? "Edit the reward details below."
            : "Add a new reward to the system."}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4 py-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Name</label>
          <Input
            name="name"
            value={reward.name ?? ""}
            onChange={onInputChange}
            placeholder="Enter reward name"
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Icon</label>
          <Select
            value={reward.iconName ?? "Gift"}
            onValueChange={(value) => onSelectChange("iconName", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <DynamicIcon
                    name={reward.iconName ?? "Gift"}
                    className="h-4 w-4"
                  />
                  {reward.iconName ?? "Gift"}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.keys(iconMap).map((iconName) => (
                <SelectItem key={iconName} value={iconName}>
                  <div className="flex items-center gap-2">
                    <DynamicIcon name={iconName} className="h-4 w-4" />
                    {iconName}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">
            Price (Points)
          </label>
          <Input
            type="number"
            name="price"
            value={reward.price ?? 0}
            onChange={onInputChange}
            min={0}
            placeholder="Enter price in points"
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Stock</label>
          <Input
            type="number"
            name="stock"
            value={reward.stock ?? 0}
            onChange={onInputChange}
            min={0}
            placeholder="Enter stock quantity"
            required
          />
        </div>
      </div>

      <SheetFooter className="flex justify-end gap-2 pt-4">
        <Button
          onClick={onCreateOrUpdateReward}
          className="bg-infinity hover:bg-infinity/90"
        >
          {isEditMode ? "Update Reward" : "Create Reward"}
        </Button>
        <SheetClose asChild>
          <Button variant="outline">Cancel</Button>
        </SheetClose>
      </SheetFooter>
    </SheetContent>
  );
};
