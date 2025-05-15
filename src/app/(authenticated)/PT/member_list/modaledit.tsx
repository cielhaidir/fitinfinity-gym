import React, { useState, useEffect } from "react";
import { Member } from "./schema";
import { Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ModalEditProps {
  open: boolean;
  onClose: () => void;
  member: Member | null;
  onSave: (updated: Member) => void;
}

export default function ModalEdit({ open, onClose, member, onSave }: ModalEditProps) {
  const [form, setForm] = useState<Member | null>(null);

  useEffect(() => {
    setForm(member);
  }, [member]);

  if (!form || !member) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) =>
      prev ? { ...prev, [name]: (name === "height" || name === "weight") ? Number(value) || null : value } : prev
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
      <DialogContent className="sm:max-w-[450px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Member Details</DialogTitle>
          <DialogDescription>
            Editing physical attributes for: {member.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="height">Height (cm)</Label>
            <Input
              type="number"
              name="height"
              id="height"
              value={form.height ?? ""}
              onChange={handleChange}
              placeholder="Height in cm"
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              type="number"
              name="weight"
              id="weight"
              value={form.weight ?? ""}
              onChange={handleChange}
              placeholder="Weight in kg"
              min={0}
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