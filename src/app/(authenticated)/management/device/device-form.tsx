"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface DeviceFormProps {
  device?: {
    id: string;
    name: string;
    accessKey: string;
    isActive?: boolean;
  } | null;
  onSuccess?: () => void;
}

export function DeviceForm({ device, onSuccess }: DeviceFormProps) {
  const [form, setForm] = useState({
    name: device?.name ?? "",
    accessKey: device?.accessKey ?? "",
    isActive: device?.isActive ?? true,
  });

  const utils = api.useUtils();

  const createMutation = api.device.create.useMutation({
    onSuccess: () => {
      toast.success("Device created successfully");
      void utils.device.list.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = api.device.update.useMutation({
    onSuccess: () => {
      toast.success("Device updated successfully");
      void utils.device.list.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const generateRandomAccessKey = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const length = 16;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setForm((prev) => ({
      ...prev,
      accessKey: result,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (device?.id) {
      updateMutation.mutate({
        id: device.id,
        ...form,
      });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? e.target.checked : value,
    }));
  };

  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle>
          {device ? "Edit Device" : "Add New Device"}
        </SheetTitle>
      </SheetHeader>

      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            value={form.name}
            onChange={handleInputChange}
            placeholder="Enter device name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="accessKey">Access Key</Label>
          <div className="flex gap-2">
            <Input
              id="accessKey"
              name="accessKey"
              value={form.accessKey}
              onChange={handleInputChange}
              placeholder="Enter access key"
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={generateRandomAccessKey}
              className="whitespace-nowrap"
            >
              Generate Key
            </Button>
          </div>
        </div>

        {device && (
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              name="isActive"
              checked={form.isActive}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, isActive: checked }))
              }
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
        )}

        <SheetFooter>
          <Button
            type="submit"
            disabled={
              createMutation.isPending ||
              updateMutation.isPending ||
              !form.name ||
              !form.accessKey
            }
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : device
              ? "Update Device"
              : "Add Device"}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}