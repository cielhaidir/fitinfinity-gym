"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import { useRFIDCheckIn } from "../hooks/useRFIDCheckIn";
import { api } from "@/trpc/react";
import { toast } from "sonner";

function formatFacilityDescription(lokerNumber: string, handuk: string): string {
  const parts: string[] = [];
  
  if (lokerNumber.trim()) {
    parts.push(`Loker = ${lokerNumber.trim()}`);
  }
  
  if (handuk !== "None") {
    parts.push(`Handuk = ${handuk}`);
  }
  
  return parts.length > 0 ? parts.join(", ") : "";
}

export function GlobalCheckInModal() {
  const { isCheckInModalOpen, selectedMemberForCheckIn, closeCheckInModal } = useRFIDCheckIn();
  
  const [lokerNumber, setLokerNumber] = useState<string>("");
  const [handukSelection, setHandukSelection] = useState<string>("None");

  const manualCheckInMutation = api.esp32.manualCheckIn.useMutation({
    onSuccess: () => {
      toast.success("Member checked in successfully");
      handleCancel();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleConfirmCheckIn = async () => {
    if (!selectedMemberForCheckIn) return;

    const formattedDescription = formatFacilityDescription(lokerNumber, handukSelection);

    try {
      await manualCheckInMutation.mutateAsync({
        memberId: selectedMemberForCheckIn.id,
        facilityDescription: formattedDescription || undefined,
      });
    } catch (error) {
      console.error("Error during manual check-in:", error);
    }
  };

  const handleCancel = () => {
    setLokerNumber("");
    setHandukSelection("None");
    closeCheckInModal();
  };

  return (
    <Dialog open={isCheckInModalOpen} onOpenChange={closeCheckInModal}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>RFID Check-in</DialogTitle>
          <DialogDescription>
            {selectedMemberForCheckIn && (
              <>
                Check in <strong>{selectedMemberForCheckIn.user.name}</strong> via RFID scan.
                Please specify which facility they are using (optional).
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Facility Usage
            </label>
            <div className="space-y-3">
              <div className="grid gap-2">
                <label htmlFor="loker" className="text-sm">
                  Loker Number (Optional)
                </label>
                <Input
                  type="number"
                  placeholder="Enter loker number (optional)"
                  value={lokerNumber}
                  onChange={(e) => setLokerNumber(e.target.value)}
                  min="1"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="handuk" className="text-sm">
                  Handuk
                </label>
                <Select value={handukSelection} onValueChange={setHandukSelection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select handuk option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Besar">Besar</SelectItem>
                    <SelectItem value="Kecil">Kecil</SelectItem>
                    <SelectItem value="Keduanya">Keduanya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={manualCheckInMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmCheckIn}
            disabled={manualCheckInMutation.isPending}
            className="bg-infinity"
          >
            {manualCheckInMutation.isPending ? "Checking in..." : "Check In"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}