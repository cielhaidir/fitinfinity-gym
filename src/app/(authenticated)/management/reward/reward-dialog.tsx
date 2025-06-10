"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface RewardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reward: Partial<{
    id: string;
    name: string;
    iconName: string;
    price: number;
    stock: number;
  }> | null;
}

export function RewardDialog({
  open,
  onOpenChange,
  reward,
}: RewardDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    iconName: "",
    price: 0,
    stock: 0,
  });

  const utils = api.useUtils();

  const createReward = api.reward.create.useMutation({
    onSuccess: () => {
      toast.success("Reward created successfully");
      void utils.reward.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateReward = api.reward.update.useMutation({
    onSuccess: () => {
      toast.success("Reward updated successfully");
      void utils.reward.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (reward) {
      setFormData({
        name: reward.name || "",
        iconName: reward.iconName || "",
        price: reward.price || 0,
        stock: reward.stock || 0,
      });
    } else {
      setFormData({
        name: "",
        iconName: "",
        price: 0,
        stock: 0,
      });
    }
  }, [reward]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (reward?.id) {
      updateReward.mutate({
        id: reward.id,
        ...formData,
      });
    } else {
      createReward.mutate(formData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{reward ? "Edit Reward" : "Add New Reward"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="iconName" className="text-right">
                Icon Name
              </Label>
              <Input
                id="iconName"
                value={formData.iconName}
                onChange={(e) =>
                  setFormData({ ...formData, iconName: e.target.value })
                }
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Points Required
              </Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: parseInt(e.target.value) })
                }
                className="col-span-3"
                required
                min={0}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock" className="text-right">
                Stock
              </Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: parseInt(e.target.value) })
                }
                className="col-span-3"
                required
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="bg-infinity">
              {reward ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
