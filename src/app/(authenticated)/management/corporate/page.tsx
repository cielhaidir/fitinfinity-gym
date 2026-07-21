"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Building2, Search } from "lucide-react";

interface CorporateForm {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  isActive: boolean;
}

const emptyForm: CorporateForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  isActive: true,
};

export default function CorporatePage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState<CorporateForm>(emptyForm);

  const { data, isLoading, refetch } = api.corporate.list.useQuery({
    search: search || undefined,
    page,
    limit,
  });

  const createMut = api.corporate.create.useMutation({
    onSuccess: () => {
      toast.success("Corporate berhasil dibuat.");
      setDialogOpen(false);
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = api.corporate.update.useMutation({
    onSuccess: () => {
      toast.success("Corporate berhasil diperbarui.");
      setDialogOpen(false);
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMut = api.corporate.toggleActive.useMutation({
    onSuccess: (data) => {
      toast.success(`Corporate ${data.isActive ? "diaktifkan" : "dinonaktifkan"}.`);
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (corp: any) => {
    setEditTarget(corp);
    setForm({
      name: corp.name,
      contactPerson: corp.contactPerson ?? "",
      phone: corp.phone ?? "",
      email: corp.email ?? "",
      address: corp.address ?? "",
      notes: corp.notes ?? "",
      isActive: corp.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, ...payload, isActive: form.isActive });
    } else {
      createMut.mutate(payload);
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;
  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  return (
    <ProtectedRoute requiredPermissions={["manage:corporate"]}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Corporate</h1>
              <p className="text-muted-foreground">Kelola daftar perusahaan / corporate partner</p>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Corporate
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama / PIC / email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Corporate</TableHead>
                <TableHead>PIC / Kontak</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Memuat...</TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada corporate.</TableCell>
                </TableRow>
              ) : (
                data?.items.map((corp) => (
                  <TableRow key={corp.id}>
                    <TableCell>
                      <div className="font-medium">{corp.name}</div>
                      {corp.address && <div className="text-xs text-muted-foreground">{corp.address}</div>}
                    </TableCell>
                    <TableCell>{corp.contactPerson ?? "-"}</TableCell>
                    <TableCell>{corp.phone ?? "-"}</TableCell>
                    <TableCell>{corp.email ?? "-"}</TableCell>
                    <TableCell>
                      {corp.isActive
                        ? <Badge className="bg-green-500 text-white">Aktif</Badge>
                        : <Badge variant="secondary">Nonaktif</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-center">
                        <Button size="sm" variant="outline" onClick={() => openEdit(corp)}>
                          <Pencil className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={corp.isActive ? "text-red-500" : "text-green-600"}
                          disabled={toggleMut.isPending}
                          onClick={() => toggleMut.mutate({ id: corp.id })}
                        >
                          {corp.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total: {data?.total} corporate</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
              <span className="px-2 py-1">Hal {page} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Dialog Form ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Corporate" : "Tambah Corporate Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nama Corporate <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: PT Maju Bersama"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Person In Charge (PIC)</Label>
                <Input
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  placeholder="Nama kontak"
                />
              </div>
              <div>
                <Label>Telepon</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="08xx-xxxx-xxxx"
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contact@company.com"
              />
            </div>
            <div>
              <Label>Alamat</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Alamat perusahaan"
              />
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Catatan tambahan..."
                rows={2}
              />
            </div>
            {editTarget && (
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
                <Label>Status: {form.isActive ? "Aktif" : "Nonaktif"}</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button disabled={!form.name.trim() || isSaving} onClick={handleSubmit}>
              {isSaving ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Tambah Corporate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
