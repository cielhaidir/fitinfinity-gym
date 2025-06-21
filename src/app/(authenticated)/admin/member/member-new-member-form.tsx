"use client";

import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { useState } from "react";

interface MemberNewMemberFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string;
}

export const MemberNewMemberForm: React.FC<MemberNewMemberFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
  error = "",
}) => {
  const { data: fcs } = api.fc.list.useQuery({
    page: 1,
    limit: 100,
    search: "",
    searchColumn: "",
  });
  const { data: pts } = api.personalTrainer.list.useQuery({
    page: 1,
    limit: 100,
    search: "",
    searchColumn: "",
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    address: "",
    phone: "",
    birthDate: "",
    fcId: "none",
    personalTrainerId: "none",
    rfidNumber: "",
    idNumber: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    onSubmit({
      ...form,
      fcId: form.fcId === "none" ? null : form.fcId,
      personalTrainerId: form.personalTrainerId === "none" ? null : form.personalTrainerId,
      birthDate: form.birthDate ? new Date(form.birthDate) : undefined,
    });
  };

  return (
    <SheetContent side="right" className="w-full overflow-y-auto">
      <SheetHeader>
        <SheetTitle>Tambah Member</SheetTitle>
        <SheetDescription>Masukkan data member baru.</SheetDescription>
      </SheetHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-8 sm:px-0">
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <div>
          <label htmlFor="name" className="block text-sm font-medium">Nama</label>
          <Input id="name" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
        </div>
        <div>
          <label htmlFor="address" className="block text-sm font-medium">Alamat</label>
          <Input id="address" name="address" value={form.address} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium">No. HP</label>
          <Input id="phone" name="phone" value={form.phone} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="birthDate" className="block text-sm font-medium">Tanggal Lahir</label>
          <Input id="birthDate" name="birthDate" type="date" value={form.birthDate} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="fcId" className="block text-sm font-medium">Fitness Consultant</label>
          <Select value={form.fcId} onValueChange={(value) => handleSelectChange("fcId", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih FC" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {fcs?.items.map((fc) => (
                <SelectItem key={fc.id} value={fc.id}>
                  {fc.user?.name || "Unnamed FC"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="personalTrainerId" className="block text-sm font-medium">Personal Trainer</label>
          <Select value={form.personalTrainerId} onValueChange={(value) => handleSelectChange("personalTrainerId", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih PT" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {pts?.items.map((pt) => (
                <SelectItem key={pt.id} value={pt.id}>
                  {pt.user?.name || "Unnamed PT"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="rfidNumber" className="block text-sm font-medium">RFID Number</label>
          <Input id="rfidNumber" name="rfidNumber" value={form.rfidNumber} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="idNumber" className="block text-sm font-medium">ID Number</label>
          <Input id="idNumber" name="idNumber" value={form.idNumber} onChange={handleChange} />
        </div>
        <SheetFooter className="flex justify-end gap-2 mt-4">
          <Button type="submit" className="bg-infinity" disabled={loading}>
            {loading ? "Menyimpan..." : "Tambah Member"}
          </Button>
          <SheetClose asChild>
            <Button variant="outline" type="button" onClick={onCancel}>
              Cancel
            </Button>
          </SheetClose>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}; 