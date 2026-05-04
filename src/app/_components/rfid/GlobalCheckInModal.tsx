"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRFIDCheckIn } from "../hooks/useRFIDCheckIn";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Loader2, Clock, Users, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

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
  const { isCheckInModalOpen, selectedMemberForCheckIn, closeCheckInModal, queueLength } = useRFIDCheckIn();
  
  const [lokerNumber, setLokerNumber] = useState<string>("");
  const [handukSelection, setHandukSelection] = useState<string>("None");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Reset form fields when the current member changes (next in queue)
  useEffect(() => {
    setLokerNumber("");
    setHandukSelection("None");
    setSelectedClassId(null);
  }, [selectedMemberForCheckIn?.id]);

  // Determine check-in mode
  const { data: checkInMode, isLoading: isLoadingMode } = api.memberClass.getCheckInMode.useQuery(
    { memberId: selectedMemberForCheckIn?.id ?? "" },
    { enabled: !!selectedMemberForCheckIn?.id },
  );

  // Get available classes today (if mode is "class" or "gym_class")
  const { data: availableClasses, isLoading: isLoadingClasses } = api.memberClass.getAvailableClassesToday.useQuery(
    { memberId: selectedMemberForCheckIn?.id ?? "" },
    { enabled: !!selectedMemberForCheckIn?.id && (checkInMode?.mode === "class" || checkInMode?.mode === "gym_class") },
  );

  // Gym check-in mutation
  const manualCheckInMutation = api.esp32.manualCheckIn.useMutation({
    onSuccess: () => {
      toast.success("Member checked in successfully");
      handleCancel();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Class check-in mutation
  const classCheckInMutation = api.memberClass.classCheckIn.useMutation({
    onSuccess: (data) => {
      const remaining = (data.remainingSessions || 0) + data.remainingBonusSessions;
      toast.success(`Class check-in berhasil! Sisa sesi: ${remaining}`);
      handleCancel();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleConfirmGymCheckIn = async () => {
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

  const handleConfirmClassCheckIn = async () => {
    if (!selectedMemberForCheckIn || !selectedClassId) return;
    try {
      await classCheckInMutation.mutateAsync({
        memberId: selectedMemberForCheckIn.id,
        classId: selectedClassId,
      });
    } catch (error) {
      console.error("Error during class check-in:", error);
    }
  };

  const gymClassCheckInMutation = api.esp32.manualCheckIn.useMutation();
  const gymClassClassCheckInMutation = api.memberClass.classCheckIn.useMutation();

  const handleConfirmGymClassCheckIn = async () => {
    if (!selectedMemberForCheckIn) return;
    const formattedDescription = formatFacilityDescription(lokerNumber, handukSelection);
    try {
      // 1. Gym check-in (attendance + points)
      await gymClassCheckInMutation.mutateAsync({
        memberId: selectedMemberForCheckIn.id,
        facilityDescription: formattedDescription || undefined,
      });
      // 2. Class check-in if a class is selected (deduct session)
      if (selectedClassId) {
        const result = await gymClassClassCheckInMutation.mutateAsync({
          memberId: selectedMemberForCheckIn.id,
          classId: selectedClassId,
        });
        const remaining = (result.remainingSessions || 0) + result.remainingBonusSessions;
        toast.success(`Check-in berhasil! Sisa sesi class: ${remaining}`);
      } else {
        toast.success("Member checked in successfully");
      }
      handleCancel();
    } catch (error: any) {
      toast.error(error?.message || "Check-in gagal");
      console.error("Error during gym+class check-in:", error);
    }
  };

  const handleCancel = () => {
    setLokerNumber("");
    setHandukSelection("None");
    setSelectedClassId(null);
    closeCheckInModal();
  };

  const isPending = manualCheckInMutation.isPending || classCheckInMutation.isPending || gymClassCheckInMutation.isPending || gymClassClassCheckInMutation.isPending;
  const mode = checkInMode?.mode ?? null;
  const hasClassSub = mode === "class" || mode === "gym_class";

  return (
    <Dialog open={isCheckInModalOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Member Check-in
            {queueLength > 1 && (
              <span className="inline-flex items-center rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-medium text-white">
                +{queueLength - 1} antrian
              </span>
            )}
          </DialogTitle>
          {selectedMemberForCheckIn && (
            <div className="flex items-center gap-4 py-4">
              <Avatar className="h-20 w-20 border-2 border-[#BFFF00]">
                <AvatarImage
                  src={selectedMemberForCheckIn.user.image || ""}
                  alt={selectedMemberForCheckIn.user.name || "Member"}
                />
                <AvatarFallback className="bg-[#BFFF00] text-black text-2xl font-semibold">
                  {selectedMemberForCheckIn.user.name?.charAt(0) || "M"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">
                  {selectedMemberForCheckIn.user.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedMemberForCheckIn.user.email}
                </p>
                {hasClassSub && checkInMode?.subscription && (
                  <Badge variant="secondary" className="mt-1">
                    {checkInMode.subscription.package.name} — Sisa: {(checkInMode.subscription.remainingSessions || 0) + (checkInMode.subscription.remainingBonusSessions || 0)} sesi
                  </Badge>
                )}
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Loading state */}
        {isLoadingMode && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Mengecek subscription...</span>
          </div>
        )}

        {/* Mode: GYM — loker & handuk form */}
        {!isLoadingMode && mode === "gym" && (
          <>
            <DialogDescription>
              Pilih fasilitas yang digunakan (opsional).
            </DialogDescription>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Facility Usage</label>
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <label htmlFor="loker" className="text-sm">Loker Number (Optional)</label>
                    <Input
                      type="number"
                      placeholder="Enter loker number (optional)"
                      value={lokerNumber}
                      onChange={(e) => setLokerNumber(e.target.value)}
                      min="1"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="handuk" className="text-sm">Handuk</label>
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
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
                Cancel
              </Button>
              <Button type="button" onClick={handleConfirmGymCheckIn} disabled={isPending} className="bg-infinity">
                {manualCheckInMutation.isPending ? "Checking in..." : "Check In"}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Mode: GYM_CLASS — gym check-in + optional class selection */}
        {!isLoadingMode && mode === "gym_class" && (
          <>
            <DialogDescription>
              Gym check-in + pilih class untuk hari ini (opsional). Sesi class akan terpotong jika dipilih.
            </DialogDescription>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Facility Usage</label>
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <label htmlFor="loker" className="text-sm">Loker Number (Optional)</label>
                    <Input
                      type="number"
                      placeholder="Enter loker number (optional)"
                      value={lokerNumber}
                      onChange={(e) => setLokerNumber(e.target.value)}
                      min="1"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="handuk" className="text-sm">Handuk</label>
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
              <div className="grid gap-2">
                <label className="text-sm font-medium">Pilih Class Hari Ini (Opsional)</label>
                {isLoadingClasses ? (
                  <div className="flex items-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Memuat class...</span>
                  </div>
                ) : !availableClasses || availableClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tidak ada class hari ini.</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {availableClasses.map((cls) => {
                      const isSelected = selectedClassId === cls.id;
                      const isDisabled = cls.isFull || cls.isAlreadyAttended;
                      return (
                        <button
                          key={cls.id}
                          onClick={() => !isDisabled && setSelectedClassId(isSelected ? null : cls.id)}
                          disabled={isDisabled}
                          className={`w-full rounded-lg border p-3 text-left transition-colors ${
                            isSelected
                              ? "border-[#BFFF00] bg-[#BFFF00]/10"
                              : isDisabled
                              ? "border-muted bg-muted/30 opacity-60 cursor-not-allowed"
                              : "border-border hover:border-[#BFFF00]/50 hover:bg-accent"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm capitalize">{cls.name}</span>
                                {cls.classType && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{cls.classType}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(cls.schedule), "HH:mm", { locale: localeId })}</span>
                                <span>{cls.duration} menit</span>
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{cls.registeredCount}/{cls.limit ?? "∞"}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">Instruktur: {cls.instructorName}</p>
                            </div>
                            <div className="ml-2">
                              {cls.isAlreadyAttended ? (
                                <Badge variant="default" className="bg-green-600 text-[10px]">Sudah hadir</Badge>
                              ) : cls.isFull ? (
                                <Badge variant="destructive" className="text-[10px]">Penuh</Badge>
                              ) : isSelected ? (
                                <CheckCircle2 className="h-5 w-5 text-[#BFFF00]" />
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
                Cancel
              </Button>
              <Button type="button" onClick={handleConfirmGymClassCheckIn} disabled={isPending} className="bg-infinity">
                {isPending ? "Checking in..." : selectedClassId ? "Check In + Class" : "Check In"}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Mode: CLASS — pick class today */}
        {!isLoadingMode && mode === "class" && (
          <>
            <DialogDescription>
              Pilih class untuk hari ini. Sesi akan terpotong otomatis.
            </DialogDescription>
            <div className="py-2">
              {isLoadingClasses ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Memuat class hari ini...</span>
                </div>
              ) : !availableClasses || availableClasses.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center text-muted-foreground">
                  <XCircle className="h-10 w-10 mb-2" />
                  <p className="text-sm font-medium">Tidak ada class hari ini</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {availableClasses.map((cls) => {
                    const isSelected = selectedClassId === cls.id;
                    const isDisabled = cls.isFull || cls.isAlreadyAttended;

                    return (
                      <button
                        key={cls.id}
                        onClick={() => !isDisabled && setSelectedClassId(isSelected ? null : cls.id)}
                        disabled={isDisabled}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          isSelected
                            ? "border-[#BFFF00] bg-[#BFFF00]/10"
                            : isDisabled
                            ? "border-muted bg-muted/30 opacity-60 cursor-not-allowed"
                            : "border-border hover:border-[#BFFF00]/50 hover:bg-accent"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm capitalize">{cls.name}</span>
                              {cls.classType && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {cls.classType}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(cls.schedule), "HH:mm", { locale: localeId })}
                              </span>
                              <span>{cls.duration} menit</span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {cls.registeredCount}/{cls.limit ?? "∞"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Instruktur: {cls.instructorName}
                            </p>
                          </div>
                          <div className="ml-2">
                            {cls.isAlreadyAttended ? (
                              <Badge variant="default" className="bg-green-600 text-[10px]">Sudah hadir</Badge>
                            ) : cls.isFull ? (
                              <Badge variant="destructive" className="text-[10px]">Penuh</Badge>
                            ) : isSelected ? (
                              <CheckCircle2 className="h-5 w-5 text-[#BFFF00]" />
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmClassCheckIn}
                disabled={isPending || !selectedClassId}
                className="bg-infinity"
              >
                {classCheckInMutation.isPending ? "Checking in..." : "Check In Class"}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Mode: NONE — no subscription */}
        {!isLoadingMode && mode === "none" && (
          <>
            <div className="flex flex-col items-center py-8 text-center">
              <XCircle className="h-12 w-12 text-destructive mb-3" />
              <p className="font-semibold">Tidak ada subscription aktif</p>
              <p className="text-sm text-muted-foreground mt-1">
                Member ini tidak memiliki gym membership atau class session yang aktif.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Tutup
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}