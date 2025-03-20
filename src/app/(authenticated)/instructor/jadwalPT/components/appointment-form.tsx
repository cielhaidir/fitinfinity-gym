"use client";

import React, { useState, useEffect } from 'react';
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { toast } from "sonner";
import { Calendar, Clock, X } from "lucide-react";

interface AppointmentFormProps {
  selectedDate: Date | null;
  onClose: () => void;
}

export default function AppointmentForm({ selectedDate, onClose }: AppointmentFormProps) {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [time, setTime] = useState('09:00');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('60'); // Default 60 minutes
  const [formattedDate, setFormattedDate] = useState('');

  const { data: members, isLoading: isMembersLoading } = api.member.getAll.useQuery();
  
  const utils = api.useUtils();
  
  const createSession = api.trainerSession.create.useMutation({
    onSuccess: () => {
      toast.success("Jadwal berhasil ditambahkan");
      // Refresh data
      utils.trainerSession.getAll.invalidate();
      // Reset form
      setSelectedMemberId('');
      setDescription('');
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  useEffect(() => {
    if (selectedDate) {
      setFormattedDate(format(selectedDate, 'MMMM do, yyyy'));
      setTime(format(selectedDate, 'HH:mm'));
    }
  }, [selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedMemberId) {
      toast.error("Mohon isi semua field yang diperlukan");
      return;
    }

    const [hours = 0, minutes = 0] = time.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + parseInt(duration));

    createSession.mutate({
      memberId: selectedMemberId,
      date: selectedDate,
      startTime: startTime,
      endTime: endTime,
      description: description
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Tambah Jadwal</h2>
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="date" className="text-gray-300">Tanggal</Label>
        <div className="relative">
          <Input
            id="date"
            value={formattedDate}
            readOnly
            className="pl-10 bg-gray-700 border-gray-600 text-white"
            placeholder="Pilih tanggal pada kalender"
          />
          <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="time" className="text-gray-300">Waktu Mulai</Label>
        <div className="relative">
          <Input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="pl-10 bg-gray-700 border-gray-600 text-white"
          />
          <Clock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration" className="text-gray-300">Durasi</Label>
        <Select 
          value={duration} 
          onValueChange={setDuration}
        >
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder="Pilih durasi" />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600 text-white">
            <SelectItem value="30">30 menit</SelectItem>
            <SelectItem value="60">60 menit</SelectItem>
            <SelectItem value="90">90 menit</SelectItem>
            <SelectItem value="120">120 menit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="member" className="text-gray-300">Nama Member</Label>
        <Select 
          value={selectedMemberId} 
          onValueChange={setSelectedMemberId}
        >
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder="Pilih member" />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600 text-white">
            {isMembersLoading ? (
              <SelectItem value="loading" disabled>Loading members...</SelectItem>
            ) : (
              members?.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.user.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-gray-300">Deskripsi</Label>
        <Textarea
          id="description"
          placeholder="Detail sesi latihan..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="bg-gray-700 border-gray-600 text-white"
        />
      </div>

      <Button 
        type="submit" 
        className="w-full bg-lime-400 hover:bg-lime-500 text-black mt-4"
        disabled={createSession.isPending}
      >
        {createSession.isPending ? 'Menyimpan...' : 'Simpan Jadwal'}
      </Button>
    </form>
  );
} 