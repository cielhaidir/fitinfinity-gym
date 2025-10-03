"use client";

import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

const CLASS_OPTIONS = [
  "yoga",
  "zumba",
  "strengh",
  "core",
  "booty shaping",
  "cardio dance",
  "bachata",
  "muaythai",
  "poundfit",
  "freestyle dance",
  "kpop dance",
  "circuit",
  "thaiboxig",
  "Trx",
  "Airin yoga",
  "Hatha yoga",
  "bodycombat",
  "mat pilates",
  "vinyasa yoga",
  "bootcamp",
  "bodypump",
  "HIIT",
  "summit",
  "balance",
  "cardio u",
  'Upper Body',
  'Kettle Bell',
  'Mix Fight',
  'Beast Mode',
  'Lower Body',
] as const;

type ClassName = (typeof CLASS_OPTIONS)[number];

type ClassFormProps = {
  name: ClassName;
  limit: number | null;
  instructorName: string;
  schedule: Date;
  schedules?: Date[];
  duration: number;
  price: number;
  isBulkMode?: boolean;
  onNameChange: (name: ClassName) => void;
  onLimitChange: (limit: number | null) => void;
  onInstructorNameChange: (instructorName: string) => void;
  onScheduleChange: (schedule: Date) => void;
  onSchedulesChange?: (schedules: Date[]) => void;
  onDurationChange: (duration: number) => void;
  onPriceChange: (price: number) => void;
  onBulkModeChange?: (isBulkMode: boolean) => void;
  onCreateOrUpdateClass: () => void;
  isEditMode: boolean;
};

export const ClassForm = ({
  name,
  limit,
  instructorName,
  schedule,
  schedules = [],
  duration,
  price,
  isBulkMode = false,
  onNameChange,
  onLimitChange,
  onInstructorNameChange,
  onScheduleChange,
  onSchedulesChange,
  onDurationChange,
  onPriceChange,
  onBulkModeChange,
  onCreateOrUpdateClass,
  isEditMode,
}: ClassFormProps) => {
  // Handle changes and propagate to parent
  const handleNameChange = (value: ClassName) => {
    onNameChange(value);
  };

  const handleLimitChange = (value: string) => {
    const newLimit = value ? parseInt(value) : null;
    onLimitChange(newLimit);
  };

  const handleInstructorNameChange = (value: string) => {
    onInstructorNameChange(value);
  };

  const handleScheduleChange = (value: Date) => {
    onScheduleChange(value);
  };

  const handleDurationChange = (value: string) => {
    const newDuration = parseInt(value);
    onDurationChange(newDuration);
  };

  const handlePriceChange = (value: string) => {
    // Pastikan value tidak kosong dan valid
    if (value === "") {
      onPriceChange(0);
      return;
    }

    const newPrice = parseInt(value.replace(/[^0-9]/g, "")) || 0;
    onPriceChange(newPrice);
  };

  const handleBulkModeChange = (checked: boolean) => {
    onBulkModeChange?.(checked);
    
    // Initialize with current schedule if switching to bulk mode
    if (checked && schedules.length === 0) {
      const newSchedules = [schedule];
      onSchedulesChange?.(newSchedules);
    }
  };

  const handleSchedulesChange = (schedules: Date[]) => {
    onSchedulesChange?.(schedules);
  };

  const addSchedule = () => {
    const newSchedule = new Date(schedule);
    const newSchedules = [...schedules, newSchedule];
    handleSchedulesChange(newSchedules);
  };

  const removeSchedule = (index: number) => {
    const newSchedules = schedules.filter((_, i) => i !== index);
    handleSchedulesChange(newSchedules);
  };

  const updateSchedule = (index: number, newSchedule: Date) => {
    const newSchedules = [...schedules];
    newSchedules[index] = newSchedule;
    handleSchedulesChange(newSchedules);
  };

  // Removed trainer list query

  return (
    <SheetContent side="right">
      <SheetHeader>
        <SheetTitle>
          {isEditMode ? "Edit Class" : "Create New Class"}
        </SheetTitle>
      </SheetHeader>

      <div className="flex flex-col gap-4 py-8">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Class Name
          </label>
          <Select value={name} onValueChange={handleNameChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              {CLASS_OPTIONS.map((className) => (
                <SelectItem key={className} value={className}>
                  {className.charAt(0).toUpperCase() + className.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="limit" className="block text-sm font-medium">
            Student Limit
          </label>
          <Input
            type="number"
            id="limit"
            value={limit ?? ""}
            onChange={(e) => handleLimitChange(e.target.value)}
            placeholder="Enter student limit"
          />
        </div>

        <div>
          <label htmlFor="instructorName" className="block text-sm font-medium">
            Instructor Name
          </label>
          <Input
            type="text"
            id="instructorName"
            value={instructorName}
            onChange={(e) => handleInstructorNameChange(e.target.value)}
            placeholder="Enter instructor name"
          />
        </div>

        {!isEditMode && (
          <div className="flex items-center space-x-2">
            <Switch
              id="bulk-mode"
              checked={isBulkMode}
              onCheckedChange={handleBulkModeChange}
            />
            <Label htmlFor="bulk-mode">Create multiple classes with different dates</Label>
          </div>
        )}

        {!isBulkMode ? (
          <div>
            <label htmlFor="schedule" className="block text-sm font-medium">
              Schedule
            </label>
            <Input
              type="datetime-local"
              id="schedule"
              value={
                schedule
                  ? new Date(schedule.getTime() - schedule.getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16)
                  : ""
              }
              onChange={(e) => {
                const date = new Date(e.target.value);
                handleScheduleChange(date);
              }}
            />
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                Schedules ({schedules.length})
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSchedule}
              >
                Add Schedule
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {schedules.map((scheduleDate, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="datetime-local"
                    value={
                      scheduleDate
                        ? new Date(scheduleDate.getTime() - scheduleDate.getTimezoneOffset() * 60000)
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      updateSchedule(index, date);
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeSchedule(index)}
                    disabled={schedules.length <= 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="duration" className="block text-sm font-medium">
            Duration (minutes)
          </label>
          <Input
            type="number"
            id="duration"
            value={duration}
            onChange={(e) => handleDurationChange(e.target.value)}
            placeholder="Enter class duration"
          />
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium">
            Price (Rp)
          </label>
          <Input
            type="text"
            id="price"
            value={price === 0 ? "" : price.toLocaleString("id-ID")}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="Enter class price"
            onBlur={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, "");
              const newPrice = parseInt(value) || 0;
              onPriceChange(newPrice);
            }}
          />
        </div>
      </div>

      <SheetFooter>
        <Button
          type="button"
          onClick={onCreateOrUpdateClass}
          className="bg-infinity"
          disabled={
            !name ||
            !instructorName ||
            (isBulkMode && schedules.length === 0)
          }
        >
          {isEditMode ? "Update" : isBulkMode ? `Create ${schedules.length} Classes` : "Create"} Class
        </Button>
      </SheetFooter>
    </SheetContent>
  );
};
