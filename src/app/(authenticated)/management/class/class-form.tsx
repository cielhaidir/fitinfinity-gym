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
import { useEffect, useState } from "react";

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
] as const;

type ClassName = (typeof CLASS_OPTIONS)[number];

type ClassFormProps = {
  name: ClassName;
  limit: number | null;
  instructorName: string;
  schedule: Date;
  duration: number;
  price: number;
  onNameChange: (name: ClassName) => void;
  onLimitChange: (limit: number | null) => void;
  onInstructorNameChange: (instructorName: string) => void;
  onScheduleChange: (schedule: Date) => void;
  onDurationChange: (duration: number) => void;
  onPriceChange: (price: number) => void;
  onCreateOrUpdateClass: () => void;
  isEditMode: boolean;
};

export const ClassForm = ({
  name,
  limit,
  instructorName,
  schedule,
  duration,
  price,
  onNameChange,
  onLimitChange,
  onInstructorNameChange,
  onScheduleChange,
  onDurationChange,
  onPriceChange,
  onCreateOrUpdateClass,
  isEditMode,
}: ClassFormProps) => {
  // Local state
  const [localName, setLocalName] = useState(name);
  const [localLimit, setLocalLimit] = useState<number | null>(limit);
  const [localInstructorName, setLocalInstructorName] = useState(instructorName);
  const [localSchedule, setLocalSchedule] = useState(schedule);
  const [localDuration, setLocalDuration] = useState(duration);
  const [localPrice, setLocalPrice] = useState(price);

  // Update local state when props change
  useEffect(() => {
    setLocalName(name);
    setLocalLimit(limit);
    setLocalInstructorName(instructorName);
    setLocalSchedule(schedule);
    setLocalDuration(duration);
    setLocalPrice(price);
  }, [name, limit, instructorName, schedule, duration, price]);

  // Handle local changes and propagate to parent
  const handleNameChange = (value: ClassName) => {
    setLocalName(value);
    onNameChange(value);
  };

  const handleLimitChange = (value: string) => {
    const newLimit = value ? parseInt(value) : null;
    setLocalLimit(newLimit);
    onLimitChange(newLimit);
  };

  const handleInstructorNameChange = (value: string) => {
    setLocalInstructorName(value);
    onInstructorNameChange(value);
  };

  const handleScheduleChange = (value: Date) => {
    setLocalSchedule(value);
    onScheduleChange(value);
  };

  const handleDurationChange = (value: string) => {
    const newDuration = parseInt(value);
    setLocalDuration(newDuration);
    onDurationChange(newDuration);
  };

  const handlePriceChange = (value: string) => {
    // Pastikan value tidak kosong dan valid
    if (value === "") {
      setLocalPrice(0);
      onPriceChange(0);
      return;
    }

    const newPrice = parseInt(value.replace(/[^0-9]/g, "")) || 0;
    setLocalPrice(newPrice);
    onPriceChange(newPrice);
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
          <Select value={localName} onValueChange={handleNameChange}>
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
            value={localLimit ?? ""}
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
            value={localInstructorName}
            onChange={(e) => handleInstructorNameChange(e.target.value)}
            placeholder="Enter instructor name"
          />
        </div>

        <div>
          <label htmlFor="schedule" className="block text-sm font-medium">
            Schedule
          </label>
          <Input
            type="datetime-local"
            id="schedule"
            value={
              new Date(localSchedule.getTime() - localSchedule.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16)
            }
            onChange={(e) => {
              const date = new Date(e.target.value);
              // Convert from local time to UTC for consistent storage
              const adjustedDate = new Date(
                date.getTime() + date.getTimezoneOffset() * 60000
              );
              handleScheduleChange(adjustedDate);
            }}
          />
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium">
            Duration (minutes)
          </label>
          <Input
            type="number"
            id="duration"
            value={localDuration}
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
            value={localPrice === 0 ? "" : localPrice.toLocaleString("id-ID")}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="Enter class price"
            onBlur={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, "");
              const price = parseInt(value) || 0;
              setLocalPrice(price);
              onPriceChange(price);
            }}
          />
        </div>
      </div>

      <SheetFooter>
        <Button
          type="button"
          onClick={onCreateOrUpdateClass}
          className="bg-infinity"
          disabled={!localName || !localInstructorName}
        >
          {isEditMode ? "Update" : "Create"} Class
        </Button>
      </SheetFooter>
    </SheetContent>
  );
};
