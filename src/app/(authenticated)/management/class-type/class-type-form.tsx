"use client";

import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface ClassTypeFormProps {
  name: string;
  icon: string;
  description: string;
  level: "Easy" | "Medium" | "Hard";
  isActive: boolean;
  onNameChange: (name: string) => void;
  onIconChange: (icon: string) => void;
  onDescriptionChange: (description: string) => void;
  onLevelChange: (level: "Easy" | "Medium" | "Hard") => void;
  onIsActiveChange: (isActive: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEditMode: boolean;
  isLoading: boolean;
}

export const ClassTypeForm: React.FC<ClassTypeFormProps> = ({
  name,
  icon,
  description,
  level,
  isActive,
  onNameChange,
  onIconChange,
  onDescriptionChange,
  onLevelChange,
  onIsActiveChange,
  onSubmit,
  onCancel,
  isEditMode,
  isLoading,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <SheetContent side="right" className="w-[400px] sm:w-[540px]">
      <SheetHeader>
        <SheetTitle>
          {isEditMode ? "Edit Class Type" : "Create New Class Type"}
        </SheetTitle>
      </SheetHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-8">
        <div className="space-y-2">
          <Label htmlFor="name">Class Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter class name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="icon">Icon *</Label>
          <Select value={icon} onValueChange={onIconChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select an icon">
                {icon && (
                  <div className="flex items-center gap-2">
                    <i className={`${icon} text-[#C9D953]`}></i>
                    <span>{icon}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="fas fa-spa">
                <div className="flex items-center gap-2">
                  <i className="fas fa-spa text-[#C9D953]"></i>
                  <span>Spa/Yoga</span>
                </div>
              </SelectItem>
              <SelectItem value="fas fa-dumbbell">
                <div className="flex items-center gap-2">
                  <i className="fas fa-dumbbell text-[#C9D953]"></i>
                  <span>Dumbbell/Strength</span>
                </div>
              </SelectItem>
              <SelectItem value="fas fa-music">
                <div className="flex items-center gap-2">
                  <i className="fas fa-music text-[#C9D953]"></i>
                  <span>Music/Dance</span>
                </div>
              </SelectItem>
              <SelectItem value="fas fa-fire">
                <div className="flex items-center gap-2">
                  <i className="fas fa-fire text-[#C9D953]"></i>
                  <span>Fire/Intense</span>
                </div>
              </SelectItem>
              <SelectItem value="fas fa-heart">
                <div className="flex items-center gap-2">
                  <i className="fas fa-heart text-[#C9D953]"></i>
                  <span>Heart/Cardio</span>
                </div>
              </SelectItem>
              <SelectItem value="fas fa-fist-raised">
                <div className="flex items-center gap-2">
                  <i className="fas fa-fist-raised text-[#C9D953]"></i>
                  <span>Fist/Combat</span>
                </div>
              </SelectItem>
              <SelectItem value="fas fa-leaf">
                <div className="flex items-center gap-2">
                  <i className="fas fa-leaf text-[#C9D953]"></i>
                  <span>Leaf/Gentle</span>
                </div>
              </SelectItem>
              <SelectItem value="fas fa-star">
                <div className="flex items-center gap-2">
                  <i className="fas fa-star text-[#C9D953]"></i>
                  <span>Star/Popular</span>
                </div>
              </SelectItem>
              <SelectItem value="fas fa-drum">
                <div className="flex items-center gap-2">
                  <i className="fas fa-drum text-[#C9D953]"></i>
                  <span>Drum/Rhythmic</span>
                </div>
              </SelectItem>
              <SelectItem value="fas fa-mountain">
                <div className="flex items-center gap-2">
                  <i className="fas fa-mountain text-[#C9D953]"></i>
                  <span>Mountain/Challenge</span>
                </div>
              </SelectItem>
              <SelectItem value="fas fa-running">
                <div className="flex items-center gap-2">
                  <i className="fas fa-running text-[#C9D953]"></i>
                  <span>Running/Cardio</span>
                </div>
              </SelectItem>
              <SelectItem value="fas fa-swimmer">
                <div className="flex items-center gap-2">
                  <i className="fas fa-swimmer text-[#C9D953]"></i>
                  <span>Swimming/Water</span>
                </div>
              </SelectItem>
              <SelectItem value="fas fa-bicycle">
                <div className="flex items-center gap-2">
                  <i className="fas fa-bicycle text-[#C9D953]"></i>
                  <span>Cycling/Bike</span>
                </div>
              </SelectItem>
              <SelectItem value="fas fa-bolt">
                <div className="flex items-center gap-2">
                  <i className="fas fa-bolt text-[#C9D953]"></i>
                  <span>Lightning/Power</span>
                </div>
              </SelectItem>
              <SelectItem value="fas fa-trophy">
                <div className="flex items-center gap-2">
                  <i className="fas fa-trophy text-[#C9D953]"></i>
                  <span>Trophy/Achievement</span>
                </div>
              </SelectItem>
              <SelectItem value="fas fa-shield-alt">
                <div className="flex items-center gap-2">
                  <i className="fas fa-shield-alt text-[#C9D953]"></i>
                  <span>Shield/Defense</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose an icon that best represents this class type
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Enter class description"
            rows={3}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="level">Difficulty Level</Label>
          <Select value={level} onValueChange={onLevelChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select difficulty level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Easy">Easy</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isEditMode && (
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={onIsActiveChange}
            />
            <Label htmlFor="active">Active</Label>
          </div>
        )}

        <div className="flex space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-infinity"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : isEditMode ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </SheetContent>
  );
};