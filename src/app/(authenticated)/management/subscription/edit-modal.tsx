import React, { useState, useEffect } from "react";
import { Subscription } from "./schema";
import { Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditModalProps {
  open: boolean;
  onClose: () => void;
  subscription: Subscription | null;
  onSave: (updated: Subscription) => void;
}

export default function EditModal({ open, onClose, subscription, onSave }: EditModalProps) {
  const [form, setForm] = useState<Subscription | null>(null);

  useEffect(() => {
    setForm(subscription);
  }, [subscription]);

  if (!form || !subscription) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) =>
      prev ? { ...prev, [name]: value } : prev
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form) {
      onSave(form);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
          <DialogDescription>
            Edit subscription details for: {subscription.member?.user?.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="endDate">Subscription End Date</Label>
            <Input
              type="datetime-local"
              name="endDate"
              id="endDate"
              value={form.endDate ? new Date(form.endDate).toISOString().slice(0, 16) : ""}
              onChange={handleChange}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Cancel
            </Button>
            <Button
              type="submit"
              className="flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}