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
import { format, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { Calendar, Clock, X, User } from "lucide-react";

interface EditScheduleFormProps {
  session: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditScheduleForm({
  session,
  onClose,
  onSuccess,
}: EditScheduleFormProps) {
  const [selectedTrainerId, setSelectedTrainerId] = useState(session.trainer.id || "");
  const [date, setDate] = useState(format(new Date(session.date), "yyyy-MM-dd"));
  const [time, setTime] = useState(format(new Date(session.startTime), "HH:mm"));
  const [description, setDescription] = useState(session.description || "");
  
  // Calculate minimum allowed date: first day of the original session's month
  const minDate = format(startOfMonth(new Date(session.date)), "yyyy-MM-dd");
  const [duration, setDuration] = useState(() => {
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60);
    return diff.toString();
  });
  const [attendanceCount, setAttendanceCount] = useState(session.attendanceCount?.toString() || "1");
  const [status, setStatus] = useState<"ENDED" | "NOT_YET" | "CANCELED" | "ONGOING">(session.status || "NOT_YET");

  // Get all trainers
  const { data: trainers, isLoading: isLoadingTrainers } =
    api.managerCalendar.getAllTrainers.useQuery();

  const utils = api.useUtils();

  const updateSchedule = api.managerCalendar.updateSchedule.useMutation({
    onSuccess: () => {
      toast.success("Jadwal berhasil diupdate");
      utils.managerCalendar.getAll.invalidate();
      utils.trainerSession.getAll.invalidate();
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Gagal mengupdate jadwal");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate date selection
    const selectedDate = new Date(date);
    const minDateObj = new Date(minDate);
    
    if (selectedDate < minDateObj) {
      toast.error("Tanggal tidak valid. Hanya dapat memilih tanggal di bulan yang sama atau bulan berikutnya.");
      return;
    }

    const [hours = 0, minutes = 0] = time.split(":").map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + parseInt(duration));

    const isGroupSession = session.isGroup;
    const attendanceCountNum = parseInt(attendanceCount);

    if (isGroupSession && (!attendanceCount || attendanceCountNum < 1 || attendanceCountNum > 50)) {
      toast.error("Jumlah peserta harus antara 1-50 untuk sesi grup");
      return;
    }

    updateSchedule.mutate({
      sessionId: session.id,
      trainerId: selectedTrainerId,
      date: selectedDate,
      startTime: startTime,
      endTime: endTime,
      description: description,
      status: status,
      attendanceCount: isGroupSession ? attendanceCountNum : 1,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Edit Jadwal</h2>
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
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={minDate}
            className="pl-10"
          />
          <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">
          Hanya dapat memilih tanggal di bulan yang sama atau bulan berikutnya
        </p>
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
        <Label className="text-muted-foreground">
          Member
        </Label>
        <Input
          value={session.type === "group" ? session.groupName : session.member?.user?.name}
          readOnly
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Member tidak dapat diubah. Buat jadwal baru jika ingin mengganti member.
        </p>
      </div>

      {session.isGroup && (
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

      <div className="flex gap-2">
        <Button
          type="submit"
          className="flex-1 bg-[#C9D953] text-black hover:bg-[#b8c748]"
          disabled={updateSchedule.isPending}
        >
          {updateSchedule.isPending ? "Menyimpan..." : "Update Jadwal"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={updateSchedule.isPending}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}