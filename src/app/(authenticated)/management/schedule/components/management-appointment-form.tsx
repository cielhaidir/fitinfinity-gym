"use client";

import React, { useState, useEffect } from "react";
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
import { Calendar, Clock, X, User } from "lucide-react";

interface ManagementAppointmentFormProps {
  selectedDate: Date | null;
  onClose: () => void;
}

interface Member {
  id: string;
  name: string;
  membershipId: string;
  remainingSessions: number;
  type: "individual" | "group";
  groupId?: string;
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
            type: member.type,
            groupId: member.groupId,
          });
        } else {
          // For individual members, combine by name
          const existingMember = memberMap.get(member.name);
          if (existingMember && existingMember.type === "individual") {
            existingMember.remainingSessions += member.remainingSessions;
          } else {
            memberMap.set(member.name, {
              id: member.id,
              name: member.name,
              membershipId: member.membershipId,
              remainingSessions: member.remainingSessions,
              type: member.type,
              groupId: member.groupId,
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
    const map = new Map<string, { membershipId: string; type: string; remainingSessions: number; member: Member }>();

    combinedMembers.forEach((member) => {
      const stableValue = `${member.type}:${member.id}`;
      map.set(stableValue, {
        membershipId: member.membershipId,
        type: member.type,
        remainingSessions: member.remainingSessions,
        member,
      });
    });

    return map;
  }, [combinedMembers]);

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

    const selectedMemberData = memberValueMap.get(selectedMemberId);

    if (!selectedMemberData) {
      toast.error("Data member tidak valid - silakan pilih member lagi");
      return;
    }

    if (selectedMemberData.remainingSessions <= 0) {
      toast.error("Member tidak memiliki sisa sesi yang tersedia");
      return;
    }

    const [hours = 0, minutes = 0] = time.split(":").map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + parseInt(duration));

    const isGroupSession = selectedMemberData.type === "group";
    const attendanceCountNum = parseInt(attendanceCount);

    if (isGroupSession && (!attendanceCount || attendanceCountNum < 1 || attendanceCountNum > 50)) {
      toast.error("Jumlah peserta harus antara 1-50 untuk sesi grup");
      return;
    }

    createSchedule.mutate({
      trainerId: selectedTrainerId,
      memberId: selectedMemberData.membershipId,
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
        <Select
          value={selectedMemberId}
          onValueChange={setSelectedMemberId}
          disabled={!selectedTrainerId}
          key={`select-${combinedMembers.length}-${selectedTrainerId}`}
        >
          <SelectTrigger className="notranslate" translate="no">
            <SelectValue
              placeholder={selectedTrainerId ? "Pilih member" : "Pilih trainer terlebih dahulu"}
              className="notranslate"
              translate="no"
            />
          </SelectTrigger>
          <SelectContent className="notranslate" translate="no">
            {isMembersLoading ? (
              <SelectItem value="loading" disabled className="notranslate" translate="no">
                Loading members...
              </SelectItem>
            ) : combinedMembers.length === 0 ? (
              <SelectItem value="no-members" disabled className="notranslate" translate="no">
                Tidak ada member untuk trainer ini
              </SelectItem>
            ) : (
              combinedMembers.map((member) => {
                const stableValue = `${member.type}:${member.id}`;
                const isDisabled = member.remainingSessions <= 0;

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
                      {member.name} ({member.remainingSessions} sesi tersisa)
                      {isDisabled && " - Tidak tersedia"}
                    </span>
                  </SelectItem>
                );
              })
            )}
          </SelectContent>
        </Select>
      </div>

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
            <SelectItem value="CANCELED">Dibatalkan</SelectItem>
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
    </form>
  );
}