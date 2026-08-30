"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

type InstructorForm = {
  id?: string;
  name: string;
  phone: string;
  speciality: string;
  isActive: boolean;
};

const emptyForm: InstructorForm = {
  name: "",
  phone: "",
  speciality: "",
  isActive: true,
};

export default function InstructorManagementPage() {
  const utils = api.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState<InstructorForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = api.instructor.list.useQuery({
    page,
    limit: 20,
    search: search || undefined,
  });

  const createMutation = api.instructor.create.useMutation({
    onSuccess: () => {
      toast.success("Instructor berhasil ditambahkan");
      utils.instructor.list.invalidate();
      setDialogOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = api.instructor.update.useMutation({
    onSuccess: () => {
      toast.success("Instructor berhasil diupdate");
      utils.instructor.list.invalidate();
      setDialogOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMutation = api.instructor.remove.useMutation({
    onSuccess: () => {
      toast.success("Instructor berhasil dihapus");
      utils.instructor.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleOpenCreate = () => {
    setForm(emptyForm);
    setIsEdit(false);
    setDialogOpen(true);
  };

  const handleOpenEdit = (instructor: any) => {
    setForm({
      id: instructor.id,
      name: instructor.name,
      phone: instructor.phone ?? "",
      speciality: instructor.speciality ?? "",
      isActive: instructor.isActive,
    });
    setIsEdit(true);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    if (isEdit && form.id) {
      updateMutation.mutate({
        id: form.id,
        name: form.name,
        phone: form.phone || null,
        speciality: form.speciality || null,
        isActive: form.isActive,
      });
    } else {
      createMutation.mutate({
        name: form.name,
        phone: form.phone || undefined,
        speciality: form.speciality || undefined,
        isActive: form.isActive,
      });
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Hapus instructor "${name}"?`)) {
      removeMutation.mutate({ id });
    }
  };

  const handleToggleActive = (instructor: { id: string; isActive: boolean }) => {
    updateMutation.mutate({ id: instructor.id, isActive: !instructor.isActive });
  };

  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <ProtectedRoute requiredPermissions={["list:instructor"]}>
      <div className="container mx-auto min-h-screen bg-background p-4 md:p-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Instructors</h2>
            <p className="text-muted-foreground">
              Kelola daftar instructor untuk class.
            </p>
          </div>
          <Button className="w-full bg-infinity md:w-auto" onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Instructor
          </Button>
        </div>

        {/* Search */}
        <div className="mb-4 flex items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau spesialisasi..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>No. HP</TableHead>
                <TableHead>Spesialisasi</TableHead>
                <TableHead className="text-center">Total Class</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : !data?.items.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Belum ada instructor.
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((instructor) => (
                  <TableRow key={instructor.id}>
                    <TableCell className="font-medium">{instructor.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {instructor.phone || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {instructor.speciality || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{instructor._count.classes}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={instructor.isActive ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => handleToggleActive(instructor)}
                      >
                        {instructor.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(instructor)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(instructor.id, instructor.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Halaman {page} dari {totalPages} ({data?.total ?? 0} total)
              </p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Prev
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isEdit ? "Edit Instructor" : "Tambah Instructor"}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Nama *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nama instructor"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">No. HP</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Spesialisasi</label>
                <Input
                  value={form.speciality}
                  onChange={(e) => setForm((p) => ({ ...p, speciality: e.target.value }))}
                  placeholder="e.g. Yoga, Zumba, Muay Thai"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4"
                />
                <label htmlFor="isActive" className="text-sm">Aktif</label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button
                className="bg-infinity"
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {isEdit ? "Update" : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
