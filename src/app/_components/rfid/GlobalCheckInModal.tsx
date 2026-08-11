"use client";

import { useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRFIDCheckIn } from "../hooks/useRFIDCheckIn";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Loader2, Clock, Users, CheckCircle2, XCircle, X, Cake } from "lucide-react";
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

// ─── Per-member check-in card (self-contained state & mutations) ─────────────
interface CheckInCardMember {
  id: string;
  rfidNumber: string | null;
  user: { name: string | null; email: string | null; image?: string | null; birthDate?: string | Date | null };
}

interface CheckInCardProps {
  member: CheckInCardMember;
  index: number;
  total: number;
  onDone: () => void;
}

function CheckInCard({ member, index, total, onDone }: CheckInCardProps) {
  const [lokerNumber, setLokerNumber] = useState("");
  const [handukSelection, setHandukSelection] = useState("None");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Determine check-in mode
  const { data: checkInMode, isLoading: isLoadingMode } = api.memberClass.getCheckInMode.useQuery(
    { memberId: member.id },
    { enabled: !!member.id },
  );

  // Get available classes today
  const { data: availableClasses, isLoading: isLoadingClasses } = api.memberClass.getAvailableClassesToday.useQuery(
    { memberId: member.id },
    { enabled: !!member.id && (checkInMode?.mode === "class" || checkInMode?.mode === "gym_class") },
  );

  // Mutations
  const manualCheckInMutation = api.esp32.manualCheckIn.useMutation({
    onSuccess: () => { toast.success(`${member.user.name} checked in successfully`); onDone(); },
    onError: (error) => { toast.error(error.message); },
  });

  const classCheckInMutation = api.memberClass.classCheckIn.useMutation({
    onSuccess: (data) => {
      const remaining = (data.remainingSessions || 0) + data.remainingBonusSessions;
      toast.success(`Class check-in berhasil! Sisa sesi: ${remaining}`);
      onDone();
    },
    onError: (error) => { toast.error(error.message); },
  });

  const gymClassCheckInMutation = api.esp32.manualCheckIn.useMutation();
  const gymClassClassCheckInMutation = api.memberClass.classCheckIn.useMutation();

  const handleConfirmGymCheckIn = async () => {
    const formattedDescription = formatFacilityDescription(lokerNumber, handukSelection);
    try {
      await manualCheckInMutation.mutateAsync({
        memberId: member.id,
        facilityDescription: formattedDescription || undefined,
      });
    } catch (error) {
      console.error("Error during manual check-in:", error);
    }
  };

  const handleConfirmClassCheckIn = async () => {
    if (!selectedClassId) return;
    try {
      await classCheckInMutation.mutateAsync({ memberId: member.id, classId: selectedClassId });
    } catch (error) {
      console.error("Error during class check-in:", error);
    }
  };

  const handleConfirmGymClassCheckIn = async () => {
    const formattedDescription = formatFacilityDescription(lokerNumber, handukSelection);
    try {
      await gymClassCheckInMutation.mutateAsync({
        memberId: member.id,
        facilityDescription: formattedDescription || undefined,
      });
      if (selectedClassId) {
        const result = await gymClassClassCheckInMutation.mutateAsync({
          memberId: member.id,
          classId: selectedClassId,
        });
        const remaining = (result.remainingSessions || 0) + result.remainingBonusSessions;
        toast.success(`Check-in berhasil! Sisa sesi class: ${remaining}`);
      } else {
        toast.success(`${member.user.name} checked in successfully`);
      }
      onDone();
    } catch (error: any) {
      toast.error(error?.message || "Check-in gagal");
    }
  };

  const isPending = manualCheckInMutation.isPending || classCheckInMutation.isPending || gymClassCheckInMutation.isPending || gymClassClassCheckInMutation.isPending;
  const mode = checkInMode?.mode ?? null;
  const hasClassSub = mode === "class" || mode === "gym_class";

  return (
    <div className="relative w-full max-w-[500px] rounded-lg border border-border bg-background p-5 shadow-xl animate-in slide-in-from-bottom-4 fade-in duration-200">
      {/* Close button */}
      <button
        onClick={onDone}
        disabled={isPending}
        className="absolute right-3 top-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 disabled:pointer-events-none"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-base font-semibold">Member Check-in</h3>
          {total > 1 && (
            <span className="inline-flex items-center rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-medium text-white">
              {index + 1}/{total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14 border-2 border-[#BFFF00]">
            <AvatarImage src={member.user.image || ""} alt={member.user.name || "Member"} />
            <AvatarFallback className="bg-[#BFFF00] text-black text-lg font-semibold">
              {member.user.name?.charAt(0) || "M"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-lg font-semibold truncate">{member.user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
            {hasClassSub && checkInMode?.subscription && (
              <Badge variant="secondary" className="mt-1 text-[10px]">
                {checkInMode.subscription.package.name} — Sisa: {(checkInMode.subscription.remainingSessions || 0) + (checkInMode.subscription.remainingBonusSessions || 0)} sesi
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Birthday Info */}
      {(() => {
        if (!member.user.birthDate) return null;
        const bd = new Date(member.user.birthDate);
        const today = new Date();
        const todayMonth = today.getMonth();
        const todayDate = today.getDate();
        const bdMonth = bd.getMonth();
        const bdDate = bd.getDate();

        // This year's birthday
        let birthdayThisYear = new Date(today.getFullYear(), bdMonth, bdDate);
        const diffMs = birthdayThisYear.getTime() - new Date(today.getFullYear(), todayMonth, todayDate).getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        // Show if birthday is today, upcoming within 3 days, or was within the past 7 days
        if (diffDays === 0) {
          return (
            <div className="mb-3 flex items-center gap-2 rounded-md bg-pink-500/10 border border-pink-500/30 px-3 py-2">
              <Cake className="h-4 w-4 text-pink-500" />
              <span className="text-sm font-medium text-pink-500">🎂 Selamat Ulang Tahun! (hari ini)</span>
            </div>
          );
        } else if (diffDays > 0 && diffDays <= 3) {
          return (
            <div className="mb-3 flex items-center gap-2 rounded-md bg-pink-500/10 border border-pink-500/30 px-3 py-2">
              <Cake className="h-4 w-4 text-pink-500" />
              <span className="text-sm font-medium text-pink-500">🎂 Ulang tahun {diffDays} hari lagi ({format(birthdayThisYear, "dd MMM", { locale: localeId })})</span>
            </div>
          );
        } else if (diffDays < 0 && diffDays >= -7) {
          return (
            <div className="mb-3 flex items-center gap-2 rounded-md bg-pink-500/10 border border-pink-500/30 px-3 py-2">
              <Cake className="h-4 w-4 text-pink-500" />
              <span className="text-sm font-medium text-pink-500">🎂 Ulang tahun {Math.abs(diffDays)} hari yang lalu ({format(birthdayThisYear, "dd MMM", { locale: localeId })})</span>
            </div>
          );
        }
        return null;
      })()}

      {/* Loading */}
      {isLoadingMode && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Mengecek subscription...</span>
        </div>
      )}

      {/* Mode: GYM */}
      {!isLoadingMode && mode === "gym" && (
        <>
          <p className="text-xs text-muted-foreground mb-3">Pilih fasilitas yang digunakan (opsional).</p>
          <div className="space-y-3 mb-4">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Loker Number</label>
              <Input type="number" placeholder="Optional" value={lokerNumber} onChange={(e) => setLokerNumber(e.target.value)} min="1" className="h-9" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Handuk</label>
              <Select value={handukSelection} onValueChange={setHandukSelection}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Besar">Besar</SelectItem>
                  <SelectItem value="Kecil">Kecil</SelectItem>
                  <SelectItem value="Keduanya">Keduanya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={onDone} disabled={isPending}>Cancel</Button>
            <Button size="sm" onClick={handleConfirmGymCheckIn} disabled={isPending} className="bg-infinity">
              {manualCheckInMutation.isPending ? "Checking in..." : "Check In"}
            </Button>
          </div>
        </>
      )}

      {/* Mode: GYM_CLASS */}
      {!isLoadingMode && mode === "gym_class" && (
        <>
          <p className="text-xs text-muted-foreground mb-3">Gym check-in + pilih class (opsional).</p>
          <div className="space-y-3 mb-4">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Loker Number</label>
              <Input type="number" placeholder="Optional" value={lokerNumber} onChange={(e) => setLokerNumber(e.target.value)} min="1" className="h-9" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Handuk</label>
              <Select value={handukSelection} onValueChange={setHandukSelection}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Besar">Besar</SelectItem>
                  <SelectItem value="Kecil">Kecil</SelectItem>
                  <SelectItem value="Keduanya">Keduanya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Pilih Class Hari Ini (Opsional)</label>
              {isLoadingClasses ? (
                <div className="flex items-center py-2"><Loader2 className="h-4 w-4 animate-spin" /><span className="ml-2 text-xs">Memuat class...</span></div>
              ) : !availableClasses || availableClasses.length === 0 ? (
                <p className="text-xs text-muted-foreground">Tidak ada class hari ini.</p>
              ) : (
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                  {availableClasses.map((cls) => {
                    const isSelected = selectedClassId === cls.id;
                    const isDisabled = cls.isFull || cls.isAlreadyAttended;
                    return (
                      <button key={cls.id} onClick={() => !isDisabled && setSelectedClassId(isSelected ? null : cls.id)} disabled={isDisabled}
                        className={`w-full rounded-md border p-2 text-left transition-colors text-xs ${isSelected ? "border-[#BFFF00] bg-[#BFFF00]/10" : isDisabled ? "border-muted bg-muted/30 opacity-60 cursor-not-allowed" : "border-border hover:border-[#BFFF00]/50 hover:bg-accent"}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold capitalize">{cls.name}</span>
                            <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                              <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{format(new Date(cls.schedule), "HH:mm", { locale: localeId })}</span>
                              <span>{cls.duration}m</span>
                              <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{cls.registeredCount}/{cls.limit ?? "∞"}</span>
                            </div>
                          </div>
                          {cls.isAlreadyAttended ? <Badge className="bg-green-600 text-[9px]">Sudah hadir</Badge>
                            : cls.isFull ? <Badge variant="destructive" className="text-[9px]">Penuh</Badge>
                            : isSelected ? <CheckCircle2 className="h-4 w-4 text-[#BFFF00]" /> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={onDone} disabled={isPending}>Cancel</Button>
            <Button size="sm" onClick={handleConfirmGymClassCheckIn} disabled={isPending} className="bg-infinity">
              {isPending ? "Checking in..." : selectedClassId ? "Check In + Class" : "Check In"}
            </Button>
          </div>
        </>
      )}

      {/* Mode: CLASS */}
      {!isLoadingMode && mode === "class" && (
        <>
          <p className="text-xs text-muted-foreground mb-3">Pilih class untuk hari ini.</p>
          <div className="mb-4">
            {isLoadingClasses ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /><span className="ml-2 text-xs">Memuat class...</span></div>
            ) : !availableClasses || availableClasses.length === 0 ? (
              <div className="flex flex-col items-center py-4 text-center text-muted-foreground">
                <XCircle className="h-8 w-8 mb-1" /><p className="text-xs font-medium">Tidak ada class hari ini</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {availableClasses.map((cls) => {
                  const isSelected = selectedClassId === cls.id;
                  const isDisabled = cls.isFull || cls.isAlreadyAttended;
                  return (
                    <button key={cls.id} onClick={() => !isDisabled && setSelectedClassId(isSelected ? null : cls.id)} disabled={isDisabled}
                      className={`w-full rounded-md border p-2 text-left transition-colors text-xs ${isSelected ? "border-[#BFFF00] bg-[#BFFF00]/10" : isDisabled ? "border-muted bg-muted/30 opacity-60 cursor-not-allowed" : "border-border hover:border-[#BFFF00]/50 hover:bg-accent"}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold capitalize">{cls.name}</span>
                          {cls.classType && <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0">{cls.classType}</Badge>}
                          <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                            <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{format(new Date(cls.schedule), "HH:mm", { locale: localeId })}</span>
                            <span>{cls.duration}m</span>
                            <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{cls.registeredCount}/{cls.limit ?? "∞"}</span>
                          </div>
                          <p className="text-muted-foreground mt-0.5">Instruktur: {cls.instructorName}</p>
                        </div>
                        {cls.isAlreadyAttended ? <Badge className="bg-green-600 text-[9px]">Sudah hadir</Badge>
                          : cls.isFull ? <Badge variant="destructive" className="text-[9px]">Penuh</Badge>
                          : isSelected ? <CheckCircle2 className="h-4 w-4 text-[#BFFF00]" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={onDone} disabled={isPending}>Cancel</Button>
            <Button size="sm" onClick={handleConfirmClassCheckIn} disabled={isPending || !selectedClassId} className="bg-infinity">
              {classCheckInMutation.isPending ? "Checking in..." : "Check In Class"}
            </Button>
          </div>
        </>
      )}

      {/* Mode: NONE */}
      {!isLoadingMode && mode === "none" && (
        <>
          <div className="flex flex-col items-center py-6 text-center">
            <XCircle className="h-10 w-10 text-destructive mb-2" />
            <p className="font-semibold text-sm">Tidak ada subscription aktif</p>
            <p className="text-xs text-muted-foreground mt-1">Member ini tidak memiliki gym membership atau class session yang aktif.</p>
          </div>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={onDone}>Tutup</Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main container: renders stacked cards ───────────────────────────────────
export function GlobalCheckInModal() {
  const { checkInQueue, removeMemberFromQueue } = useRFIDCheckIn();

  if (checkInQueue.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative flex flex-col items-center gap-3 max-h-[90vh] overflow-y-auto py-4 px-2 w-full">
        {checkInQueue.map((member, idx) => (
          <CheckInCard
            key={member.id}
            member={member}
            index={idx}
            total={checkInQueue.length}
            onDone={() => removeMemberFromQueue(member.id)}
          />
        ))}
      </div>
    </div>
  );
}