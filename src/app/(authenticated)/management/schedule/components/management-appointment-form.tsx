"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { Combobox, type ComboboxOption } from "@/app/_components/ui/combobox";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar, Clock, X, User, AlertTriangle } from "lucide-react";
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

interface ManagementAppointmentFormProps {
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

export default function ManagementAppointmentForm({
  selectedDate,
  onClose,
}: ManagementAppointmentFormProps) {
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [time, setTime] = useState("09:00");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("60");
  const [formattedDate, setFormattedDate] = useState("");
  const [attendanceCount, setAttendanceCount] = useState("1");
  const [status, setStatus] = useState<"ENDED" | "NOT_YET" | "CANCELED" | "ONGOING">("NOT_YET");
  const [showConfirm, setShowConfirm] = useState(false);

  // Get all trainers
  const { data: trainers, isLoading: isLoadingTrainers } =
    api.managerCalendar.getAllTrainers.useQuery();

  // Get members for selected trainer
  const { data: members, isLoading: isMembersLoading } =
    api.personalTrainer.getMembersByTrainerId.useQuery(
      { trainerId: selectedTrainerId },
      {
        enabled: !!selectedTrainerId,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        staleTime: 0,
      }
    );

  // Combine members with same name and sum their remaining sessions
  const combinedMembers = React.useMemo(() => {
    if (!members) return [];

    try {
      const memberMap = new Map<string, Member>();

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
            groupId: 'groupId' in member ? member.groupId : undefined,
            groupMemberNames: (member as any).groupMemberNames ?? [],
          });
        } else {
          // For individual members, combine by name
          const existingMember = memberMap.get(member.name);
          if (existingMember && existingMember.type === "individual") {
            existingMember.remainingSessions += member.remainingSessions;
            existingMember.remainingBonusSessions += (member as any).remainingBonusSessions ?? 0;
          } else {
            memberMap.set(member.name, {
              id: member.id,
              name: member.name,
              membershipId: member.membershipId,
              remainingSessions: member.remainingSessions,
              remainingBonusSessions: (member as any).remainingBonusSessions ?? 0,
              type: member.type,
            });
          }
        }
      });

      return Array.from(memberMap.values());
    } catch (error) {
      console.error("Error in combinedMembers logic:", error);
      toast.error(`Member loading error: ${error instanceof Error ? error.message : "Unknown error"}`);
      return [];
    }
  }, [members]);

  // Create stable value map for Select component
  const memberValueMap = React.useMemo(() => {
    const map = new Map<string, { membershipId: string; type: string; remainingSessions: number; remainingBonusSessions: number; member: Member }>();

    combinedMembers.forEach((member) => {
      const stableValue = `${member.type}:${member.id}`;
      map.set(stableValue, {
        membershipId: member.membershipId,
        type: member.type,
        remainingSessions: member.remainingSessions,
        remainingBonusSessions: member.remainingBonusSessions,
        member,
      });
    });

    return map;
  }, [combinedMembers]);

  // Convert members to combobox options
  const memberOptions: ComboboxOption[] = useMemo(() => {
    return combinedMembers
      .filter((member) => member.remainingSessions > 0 || member.remainingBonusSessions > 0)
      .map((member) => {
        const stableValue = `${member.type}:${member.id}`;
        const icon = member.type === "group" ? "🏃‍♂️ " : "👤 ";
        const bonusPart = member.remainingBonusSessions > 0 ? ` + 🎁${member.remainingBonusSessions} bonus` : "";
        return {
          value: stableValue,
          label: `${icon}${member.name} (${member.remainingSessions} sesi tersisa${bonusPart})`,
        };
      });
  }, [combinedMembers]);

  // Check if selected member has checked in on the selected date
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

  const createSchedule = api.trainerSession.createSchedule.useMutation({
    onSuccess: () => {
      toast.success("Jadwal berhasil ditambahkan");
      utils.managerCalendar.getAll.invalidate();
      utils.trainerSession.getAll.invalidate();
      setSelectedTrainerId("");
      setSelectedMemberId("");
      setDescription("");
      setAttendanceCount("1");
      setStatus("NOT_YET");
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

  // Reset member selection when trainer changes
  useEffect(() => {
    setSelectedMemberId("");
  }, [selectedTrainerId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !selectedTrainerId || !selectedMemberId) {
      toast.error("Mohon isi semua field yang diperlukan");
      return;
    }

    const memberData = memberValueMap.get(selectedMemberId);

    if (!memberData) {
      toast.error("Data member tidak valid - silakan pilih member lagi");
      return;
    }

    if (memberData.remainingSessions <= 0 && memberData.remainingBonusSessions <= 0) {
      toast.error("Member tidak memiliki sisa sesi yang tersedia");
      return;
    }

    // If member hasn't checked in, show confirmation dialog
    if (checkinStatus && !checkinStatus.hasCheckedIn) {
      setShowConfirm(true);
      return;
    }

    // If member checked in AFTER the session start time, also warn
    if (checkinStatus?.hasCheckedIn && checkinStatus.checkinTime) {
      const [h = 0, m = 0] = time.split(":").map(Number);
      const sessionStart = new Date(selectedDate);
      sessionStart.setHours(h, m, 0, 0);
      const checkinDate = new Date(checkinStatus.checkinTime);
      if (checkinDate > sessionStart) {
        setShowConfirm(true);
        return;
      }
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

    createSchedule.mutate({
      trainerId: selectedTrainerId,
      memberId: memberData.membershipId,
      date: selectedDate,
      startTime: startTime,
      endTime: endTime,
      description: description,
      isGroup: isGroupSession,
      attendanceCount: isGroupSession ? attendanceCountNum : 1,
      status: status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Tambah Jadwal (Management)</h2>
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
        <Label htmlFor="trainer" className="text-muted-foreground">
          Personal Trainer
        </Label>
        <div className="relative">
          <Select
            value={selectedTrainerId}
            onValueChange={setSelectedTrainerId}
          >
            <SelectTrigger className="pl-10">
              <SelectValue placeholder="Pilih trainer" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingTrainers ? (
                <SelectItem value="loading" disabled>
                  Loading trainers...
                </SelectItem>
              ) : (
                trainers?.map((trainer) => (
                  <SelectItem key={trainer.id} value={trainer.id}>
                    {trainer.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <User className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
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
        {!selectedTrainerId ? (
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start font-normal text-muted-foreground"
            disabled
          >
            Pilih trainer terlebih dahulu
          </Button>
        ) : (
          <Combobox
            options={memberOptions}
            value={selectedMemberId}
            onValueChange={setSelectedMemberId}
            placeholder={isMembersLoading ? "Loading members..." : "Pilih member"}
            emptyText={combinedMembers.length === 0 ? "Tidak ada member untuk trainer ini" : "Member tidak ditemukan"}
            disabled={isMembersLoading || combinedMembers.length === 0}
          />
        )}
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
      {selectedMemberId && checkinStatus?.hasCheckedIn && checkinStatus.checkinTime && (() => {
        const [h = 0, m = 0] = time.split(":").map(Number);
        const sessionStart = new Date(selectedDate!);
        sessionStart.setHours(h, m, 0, 0);
        const checkinDate = new Date(checkinStatus.checkinTime);
        const isCheckinAfterSession = checkinDate > sessionStart;
        if (isCheckinAfterSession) {
          return (
            <div className="flex items-start gap-2 rounded-md border border-orange-300 bg-orange-50 p-3 dark:border-orange-700 dark:bg-orange-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
              <div className="text-sm text-orange-800 dark:text-orange-200">
                <p className="font-medium">Check-in setelah sesi dimulai!</p>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  Member check-in pukul {format(checkinDate, "HH:mm")} tetapi sesi dimulai pukul {time}. Member belum hadir saat sesi dimulai.
                </p>
              </div>
            </div>
          );
        }
        return (
          <div className="flex items-start gap-2 rounded-md border border-green-300 bg-green-50 p-3 dark:border-green-700 dark:bg-green-950">
            <span className="mt-0.5 shrink-0 text-sm">✅</span>
            <p className="text-sm text-green-800 dark:text-green-200">
              Member sudah check-in pukul <span className="font-medium">{format(checkinDate, "HH:mm")}</span>
            </p>
          </div>
        );
      })()}

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
        <Select value={status} onValueChange={(value: any) => setStatus(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NOT_YET">Belum Dimulai</SelectItem>
            <SelectItem value="ONGOING">Sedang Berlangsung</SelectItem>
            <SelectItem value="ENDED">Selesai</SelectItem>
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
        disabled={createSchedule.isPending || !selectedTrainerId}
      >
        {createSchedule.isPending ? "Menyimpan..." : "Simpan Jadwal"}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              {checkinStatus?.hasCheckedIn ? "Check-in Setelah Sesi Dimulai" : "Member Belum Check-in"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {checkinStatus?.hasCheckedIn && checkinStatus.checkinTime ? (
                <>
                  Member check-in pukul <span className="font-medium">{format(new Date(checkinStatus.checkinTime), "HH:mm")}</span> tetapi sesi dimulai pukul <span className="font-medium">{time}</span>.
                  Member belum hadir saat sesi dimulai. Apakah Anda yakin ingin tetap membuat jadwal sesi latihan?
                </>
              ) : (
                <>
                  Member ini belum melakukan check-in pada tanggal{" "}
                  <span className="font-medium">{selectedDate ? format(selectedDate, "d MMMM yyyy") : "-"}</span>.
                  Apakah Anda yakin ingin tetap membuat jadwal sesi latihan?
                </>
              )}
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