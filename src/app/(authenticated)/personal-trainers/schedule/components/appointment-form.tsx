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
import { Calendar, Clock, X } from "lucide-react";

interface AppointmentFormProps {
  selectedDate: Date | null;
  onClose: () => void;
}

interface Member {
  id: string;
  name: string;
  membershipId: string;
  remainingSessions: number;
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

    const memberMap = new Map<string, Member>();

    members.forEach((member) => {
      const existingMember = memberMap.get(member.name);
      if (existingMember) {
        // If member already exists, add remaining sessions
        existingMember.remainingSessions += member.remainingSessions;
      } else {
        // If member doesn't exist, add new entry
        memberMap.set(member.name, {
          id: member.id,
          name: member.name,
          membershipId: member.membershipId,
          remainingSessions: member.remainingSessions,
        });
      }
    });

    return Array.from(memberMap.values());
  }, [members]);

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

    // Check if member has remaining sessions
    const selectedMember = combinedMembers.find(
      (member) => member.id === selectedMemberId,
    );
    if (selectedMember && selectedMember.remainingSessions <= 0) {
      toast.error("Member tidak memiliki sisa sesi yang tersedia");
      return;
    }

    const [hours = 0, minutes = 0] = time.split(":").map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + parseInt(duration));

    // Get the membership ID from the selected member
    const membershipId = selectedMember?.membershipId;
    if (!membershipId) {
      toast.error("Data member tidak valid");
      return;
    }

    createSession.mutate({
      memberId: membershipId,
      date: selectedDate,
      startTime: startTime,
      endTime: endTime,
      description: description,
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
        <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih member" />
          </SelectTrigger>
          <SelectContent>
            {isMembersLoading ? (
              <SelectItem value="loading" disabled>
                Loading members...
              </SelectItem>
            ) : (
              combinedMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name} ({member.remainingSessions} sesi tersisa)
                </SelectItem>
              ))
            )}
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
    </form>
  );
}
