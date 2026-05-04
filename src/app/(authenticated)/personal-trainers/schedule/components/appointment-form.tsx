"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
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
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar, Clock, X, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Add global error handler for PWA debugging
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('🚨 [PWA-ERROR]', event.error);
    toast.error(`JS Error: ${event.error?.message || 'Unknown error'}`);
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 [PWA-REJECTION]', event.reason);
    toast.error(`Promise Error: ${event.reason || 'Unhandled rejection'}`);
  });
}

interface AppointmentFormProps {
  selectedDate: Date | null;
  onClose: () => void;
}

interface Member {
  id: string;
  name: string;
  membershipId: string;
  remainingSessions: number;
  remainingBonusSessions: number;
  type: "individual" | "group";
  groupId?: string;
  groupMemberNames?: string[];
}

export default function AppointmentForm({
  selectedDate,
  onClose,
}: AppointmentFormProps) {
  const { data: session } = useSession();
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [time, setTime] = useState("09:00");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("60"); // Default 60 minutes
  const [formattedDate, setFormattedDate] = useState("");
  const [attendanceCount, setAttendanceCount] = useState("1");
  const [status, setStatus] = useState<"NOT_YET" | "ONGOING" | "ENDED" | "CANCELED">("NOT_YET");
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: members, isLoading: isMembersLoading } =
    api.personalTrainer.getMembers.useQuery(undefined, {
      enabled: !!session,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
    });

  // Combine members with same name and sum their remaining sessions
  const combinedMembers = React.useMemo(() => {
    if (!members) return [];

    try {
      const memberMap = new Map<string, Member>();
      
      // Debug: Log raw member data
      console.log('🔍 [DEBUG] Raw members from API:', {
        count: members.length,
        members: members.map(m => ({
          id: m.id,
          name: m.name,
          type: m.type,
          membershipId: m.membershipId,
          remainingSessions: m.remainingSessions
        })),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR'
      });

      members.forEach((member) => {
        // For groups, don't combine by name - each group is unique
        if (member.type === "group") {
          memberMap.set(member.id, {
            id: member.id,
            name: member.name,
            membershipId: member.membershipId,
            remainingSessions: member.remainingSessions,
            remainingBonusSessions: (member as any).remainingBonusSessions ?? 0,
            type: member.type,
            groupId: member.groupId,
            groupMemberNames: (member as any).groupMemberNames ?? [],
          });
        } else {
          // For individual members, combine by name as before
          const existingMember = memberMap.get(member.name);
          if (existingMember && existingMember.type === "individual") {
            // If member already exists, add remaining sessions
            console.warn('⚠️ [DEBUG] Combining duplicate member by name:', {
              name: member.name,
              existing: { id: existingMember.id, sessions: existingMember.remainingSessions },
              new: { id: member.id, sessions: member.remainingSessions },
              combined: existingMember.remainingSessions + member.remainingSessions
            });
            existingMember.remainingSessions += member.remainingSessions;
            existingMember.remainingBonusSessions += (member as any).remainingBonusSessions ?? 0;
          } else {
            // If member doesn't exist, add new entry
            memberMap.set(member.name, {
              id: member.id,
              name: member.name,
              membershipId: member.membershipId,
              remainingSessions: member.remainingSessions,
              remainingBonusSessions: (member as any).remainingBonusSessions ?? 0,
              type: member.type,
              groupId: member.groupId,
            });
          }
        }
      });

      const result = Array.from(memberMap.values());
      console.log('✅ [DEBUG] Combined members result:', {
        originalCount: members.length,
        combinedCount: result.length,
        combined: result.map(m => ({
          id: m.id,
          name: m.name,
          type: m.type,
          remainingSessions: m.remainingSessions
        }))
      });
      
      return result;
    } catch (error) {
      console.error('❌ [DEBUG] Error in combinedMembers logic:', error);
      toast.error(`Member loading error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }, [members]);

  // Create stable value map and lookup for Select component
  const memberValueMap = React.useMemo(() => {
    const map = new Map<string, { membershipId: string; type: string; remainingSessions: number; member: Member }>();
    
    combinedMembers.forEach((member) => {
      // Use stable prefixed schema: "individual:USER_ID" or "group:GROUP_ID"
      const stableValue = `${member.type}:${member.id}`;
      map.set(stableValue, {
        membershipId: member.membershipId,
        type: member.type,
        remainingSessions: member.remainingSessions,
        member
      });
    });
    
    console.log('📋 [DEBUG] Member value map created:', {
      entries: Array.from(map.entries()).map(([key, val]) => ({
        key,
        membershipId: val.membershipId,
        type: val.type,
        sessions: val.remainingSessions
      }))
    });
    
    return map;
  }, [combinedMembers]);

  // Check if selected member has checked in today
  const selectedMemberData = memberValueMap.get(selectedMemberId);
  const { data: checkinStatus } = api.trainerSession.checkMemberCheckin.useQuery(
    {
      memberId: selectedMemberData?.membershipId ?? "",
      date: selectedDate ?? new Date(),
    },
    {
      enabled: !!selectedMemberData?.membershipId && !!selectedDate,
    },
  );

  const utils = api.useUtils();

  const createSession = api.trainerSession.create.useMutation({
    onSuccess: () => {
      toast.success("Jadwal berhasil ditambahkan");
      // Refresh data
      utils.trainerSession.getAll.invalidate();
      utils.personalTrainer.getMembers.invalidate(); // Refresh member list to update remaining sessions
      // Reset form
      setSelectedMemberId("");
      setDescription("");
      setAttendanceCount("1");
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (selectedDate) {
      setFormattedDate(format(selectedDate, "MMMM do, yyyy"));
      setTime(format(selectedDate, "HH:mm"));
    }
  }, [selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !selectedMemberId) {
      toast.error("Mohon isi semua field yang diperlukan");
      return;
    }

    // Get member data using stable value lookup
    const memberData = memberValueMap.get(selectedMemberId);
    
    console.log('📝 [DEBUG] Form submit - member lookup:', {
      selectedMemberId,
      foundData: memberData,
      mapSize: memberValueMap.size
    });
    
    if (!memberData) {
      toast.error("Data member tidak valid - silakan pilih member lagi");
      return;
    }

    if (memberData.remainingSessions <= 0) {
      toast.error("Member tidak memiliki sisa sesi yang tersedia");
      return;
    }

    // If member hasn't checked in, show confirmation dialog
    if (checkinStatus && !checkinStatus.hasCheckedIn) {
      setShowConfirm(true);
      return;
    }

    doSubmit();
  };

  const doSubmit = () => {
    if (!selectedDate) return;
    const memberData = memberValueMap.get(selectedMemberId);
    if (!memberData) return;

    const [hours = 0, minutes = 0] = time.split(":").map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + parseInt(duration));

    const isGroupSession = memberData.type === "group";
    const attendanceCountNum = parseInt(attendanceCount);
    
    if (isGroupSession && (!attendanceCount || attendanceCountNum < 1 || attendanceCountNum > 50)) {
      toast.error("Jumlah peserta harus antara 1-50 untuk sesi grup");
      return;
    }

    createSession.mutate({
      memberId: memberData.membershipId,
      date: selectedDate,
      startTime: startTime,
      endTime: endTime,
      description: description,
      isGroup: isGroupSession,
      attendanceCount: isGroupSession ? attendanceCountNum : 1,
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Tambah Jadwal</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date" className="text-muted-foreground">
          Tanggal
        </Label>
        <div className="relative">
          <Input
            id="date"
            value={formattedDate}
            readOnly
            className="pl-10"
            placeholder="Pilih tanggal pada kalender"
          />
          <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="time" className="text-muted-foreground">
          Waktu Mulai
        </Label>
        <div className="relative">
          <Input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="pl-10"
          />
          <Clock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration" className="text-muted-foreground">
          Durasi
        </Label>
        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih durasi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 menit</SelectItem>
            <SelectItem value="60">60 menit</SelectItem>
            <SelectItem value="90">90 menit</SelectItem>
            <SelectItem value="120">120 menit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="member" className="text-muted-foreground">
          Nama Member
        </Label>
        <Select
          value={selectedMemberId}
          onValueChange={(value) => {
            const memberData = memberValueMap.get(value);
            console.log('🎯 [DEBUG] Select onValueChange fired:', {
              selectedValue: value,
              memberCount: combinedMembers.length,
              matchedMemberData: memberData,
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
              timestamp: new Date().toISOString()
            });
            setSelectedMemberId(value);
          }}
          key={`select-${combinedMembers.length}-${Date.now()}`}
        >
          <SelectTrigger className="notranslate" translate="no">
            <SelectValue
              placeholder="Pilih member"
              className="notranslate"
              translate="no"
            />
          </SelectTrigger>
          <SelectContent className="notranslate" translate="no">
            {isMembersLoading ? (
              <SelectItem value="loading" disabled className="notranslate" translate="no">
                Loading members...
              </SelectItem>
            ) : (
              combinedMembers.map((member) => {
                const stableValue = `${member.type}:${member.id}`;
                const bonusSessions = (member as any).remainingBonusSessions ?? 0;
                const isDisabled = member.remainingSessions <= 0 && bonusSessions <= 0;
                const bonusPart = bonusSessions > 0 ? ` + 🎁${bonusSessions} bonus` : "";
                
                return (
                  <SelectItem
                    key={stableValue}
                    value={stableValue}
                    disabled={isDisabled}
                    className={`notranslate ${isDisabled ? "opacity-50 text-muted-foreground" : ""}`}
                    translate="no"
                  >
                    <span className="notranslate" translate="no">
                      {member.type === "group" ? "🏃‍♂️ " : "👤 "}
                      {member.name} ({member.remainingSessions} sesi tersisa{bonusPart})
                      {isDisabled && " - Tidak tersedia"}
                    </span>
                  </SelectItem>
                );
              })
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Check-in Warning */}
      {selectedMemberId && checkinStatus && !checkinStatus.hasCheckedIn && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-medium">Member belum check-in!</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Member ini belum melakukan check-in pada tanggal {selectedDate ? format(selectedDate, "d MMMM yyyy") : "-"}. Pastikan member sudah hadir di gym.
            </p>
          </div>
        </div>
      )}
      {selectedMemberId && checkinStatus?.hasCheckedIn && checkinStatus.checkinTime && (
        <div className="flex items-start gap-2 rounded-md border border-green-300 bg-green-50 p-3 dark:border-green-700 dark:bg-green-950">
          <span className="mt-0.5 shrink-0 text-sm">✅</span>
          <p className="text-sm text-green-800 dark:text-green-200">
            Member sudah check-in pukul <span className="font-medium">{format(new Date(checkinStatus.checkinTime), "HH:mm")}</span>
          </p>
        </div>
      )}

      {/* Group Member Info */}
      {memberValueMap.get(selectedMemberId)?.type === "group" && (
        <div className="rounded-md border border-border bg-muted/50 p-3 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Anggota Group:</p>
          <div className="flex flex-wrap gap-1">
            {((memberValueMap.get(selectedMemberId)?.member as any)?.groupMemberNames ?? []).length > 0 ? (
              ((memberValueMap.get(selectedMemberId)?.member as any)?.groupMemberNames as string[]).map((name: string, i: number) => (
                <span key={i} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {name}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">Belum ada anggota selain leader</span>
            )}
          </div>
        </div>
      )}

      {/* Attendance Count for Group Sessions */}
      {memberValueMap.get(selectedMemberId)?.type === "group" && (
        <div className="space-y-2">
          <Label htmlFor="attendanceCount" className="text-muted-foreground">
            Jumlah Peserta Hadir
          </Label>
          <Input
            id="attendanceCount"
            type="number"
            min="1"
            max="50"
            value={attendanceCount}
            onChange={(e) => setAttendanceCount(e.target.value)}
            placeholder="Masukkan jumlah peserta yang hadir"
          />
          <p className="text-xs text-muted-foreground">
            Untuk sesi grup, masukkan jumlah peserta yang akan hadir
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="status" className="text-muted-foreground">
          Status
        </Label>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NOT_YET">Not Yet</SelectItem>
            <SelectItem value="ONGOING">Ongoing</SelectItem>
            <SelectItem value="ENDED">Ended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-muted-foreground">
          Deskripsi
        </Label>
        <Textarea
          id="description"
          placeholder="Detail sesi latihan..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>

      <Button
        type="submit"
        className="mt-4 w-full bg-[#C9D953] text-black hover:bg-[#b8c748]"
        disabled={createSession.isPending}
      >
        {createSession.isPending ? "Menyimpan..." : "Simpan Jadwal"}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Member Belum Check-in
            </AlertDialogTitle>
            <AlertDialogDescription>
              Member ini belum melakukan check-in pada tanggal{" "}
              <span className="font-medium">{selectedDate ? format(selectedDate, "d MMMM yyyy") : "-"}</span>.
              Apakah Anda yakin ingin tetap membuat jadwal sesi latihan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirm(false);
                doSubmit();
              }}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Tetap Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
